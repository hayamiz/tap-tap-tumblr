
// config

var config = {
    num: 50,
    prefetch_num: 300,
    prefetch_img_num: 50,
    post_min_interval: 3000,
    reblog_timeout: 120*1000
}


// config end

var postData = [];
var revIndex = {}; // post-id => index of postData

var currentPostIdx = -1;
var lastPostId = null;

var nextIndicatorId = 0;
var nextAfterReblog = null;
var skipMine = null;
var skipPhoto = null;
var highRes = null;
var debugMode = null;

var postUser = null;
var postPermalink = null;
var postPhoto = null;
var postPhotoImg = null;
var postContent = null;
var postInfo = null;
var strokeMode = null;

var imgPrefetchedIdx = 0;
var imgPrefetchLastIdx = 0;
var imgPrefetchRingBufferIdx = 0;
var imgPrefetchRingBuffer = new Array(config.prefetch_img_num);
function putPrefetchRingBuffer(url){
    var img = new Image();
    img.src = url;
    imgPrefetchRingBuffer[imgPrefetchRingBufferIdx] = img;
    imgPrefetchRingBufferIdx++;
    imgPrefetchRingBufferIdx = imgPrefetchRingBufferIdx % config.prefetch_img_num;
}
function prefetchImages(idx){
    if (idx < imgPrefetchLastIdx) {
	for(var i = idx + 1;i < postData.length && i < imgPrefetchLastIdx;i++) {
	    if (postData[i].type == "photo"){
		if (highRes.checked) {
		    putPrefetchRingBuffer(postData[i].photo_url_large);
		} else {
		    putPrefetchRingBuffer(postData[i].photo_url);
		}
	    }
	}
    } else if (idx >= imgPrefetchLastIdx){
	if (idx + config.prefetch_img_num >= imgPrefetchedIdx){
	    for(var i = idx + 1;
		i < postData.length && i < idx + config.prefetch_img_num;
		i++){
		if (postData[i].type == "photo"){
		    if (highRes.checked) {
			putPrefetchRingBuffer(postData[i].photo_url_large);
		    } else {
			putPrefetchRingBuffer(postData[i].photo_url);
		    }
		}
		imgPrefetchedIdx = i;
	    }
	}
    }
    imgPrefetchLastIdx = idx;
}

var lastLoadTime = 0;
var autoLoader = setInterval(function(){
    prefetchPosts();
    // prefetchImages(currentPostIdx+1);
}, config.post_min_interval);

function loadPosts(optparams){
    if (lastLoadTime + config.post_min_interval > (new Date()).getTime()){
	return ;
    }
    lastLoadTime = (new Date()).getTime();

    var params = {method: "dashboard"};
    if (lastPostId) params.offset = String(lastPostId);
    $.extend(params, optparams);

    var ajax_params = { url: './ttt.cgi',
			data: params,
			success: function(data){
			    eval(data);
			    if (result){
				// success
				for(var idx in result){
				    post = result[idx];
				    if (!revIndex[post.id]){
					// new post
					postData.push(post);
					revIndex[post.id] = postData.length - 1;
					lastPostId = post.id;
				    }
				}
				$('#totalPostNum').html(String(postData.length));
				if (postData.length > 0 && currentPostIdx < 0){
				    prefetchImages(0);
				    currentPostIdx = 0;
				    showPost(0);
				}
			    } else {
				// failure (api rate limit?)
				setTimeout(loadPosts, 1000);
			    }
			}};
    var request_opts = {};
    req = new Request(ajax_params, request_opts);
}

function prefetchPosts(force){
    if (force || (postData.length - currentPostIdx - 1 < config.prefetch_num)){
	loadPosts();
    }
}

function showPost(idx, highres){
    if (idx >= 0 && idx < postData.length){
	var post = postData[idx];

	postUser.innerHTML = post.user;
	postPermalink.href = post.permalink;
	postInfo.innerHTML = "type: " + post.type
	if (post.type == "photo"){
	    postPhotoImg.src = "./img/large-loading.gif";
	    
	    var img_src = post.photo_url;
	    var img_width = "60%";
	    if (highres || highRes.checked){
		img_src = post.photo_url_large;
		img_width = "100%";
	    }

	    postPhotoImg.src = img_src;
	    postPhotoImg.style.width = img_width;
	    postPhoto.style.display = "block";
	} else {
	    postPhoto.style.display = "none";
	}
	postContent.innerHTML = post.content;

	$('#currentPostIdx')[0].innerHTML = String(idx+1);

	// open new window if clicked
	$('#currentPost > div.content > a').tap(function(){
	    window.open(this.href);
	    return false;
	});

	// update permalink
	var url = getPermalink();
	$('#permalink').html('permalink: <a href="'+url+'">'+url+'</a>');
    }
    reposIndicators();
}

function prevPost(){
    document.body.scrollTop = 0;
    var oldCurrentPostIdx = currentPostIdx;
    while(currentPostIdx > 0){
	currentPostIdx--;
	if (skipPhoto.checked && postData[currentPostIdx].type == "photo"){
	    continue;
	}
	if (skipMine.checked && ! postData[currentPostIdx]["reblog_key"]){
	    continue;
	}
	showPost(currentPostIdx);
	return;
    }
    currentPostIdx = oldCurrentPostIdx;
}

function nextPost(){
    document.body.scrollTop = 0;
    var oldCurrentPostIdx = currentPostIdx;
    while(currentPostIdx < postData.length - 1){
	currentPostIdx++;
	if (skipPhoto.checked && postData[currentPostIdx].type == "photo"){
	    continue;
	}
	if (skipMine.checked && (!postData[currentPostIdx]["reblog_key"])){
	    continue;
	}
	showPost(currentPostIdx);
	prefetchPosts();
	prefetchImages(currentPostIdx);
	return;
    }
    currentPostIdx = oldCurrentPostIdx;
    prefetchPosts(true);
}

function reposIndicators(){
    var iarea = $('#indicatorArea');
    var iareaElem = iarea[0];
    var l = "0px";
    var t = (window.pageYOffset +
	     window.innerHeight -
	     iareaElem.offsetHeight) + "px";
    iareaElem.style.left = l;
    iareaElem.style.top = t;
    $('#hoge').html();
}


function showIndicator(id, text, delay, fade){
    var xIndicatorId = "xIndicator_" + String(id);
    var xIndicator = $('#'+xIndicatorId);

    if (xIndicator.length == 0){
	$('#indicatorArea > ul').append('<li class="indicator" id="'+ xIndicatorId +
					'">'+text+'</li>');
    } else {
	xIndicator = $('#'+xIndicatorId);
	xIndicator.html(text);
    }

    if (arguments.length == 3){
	hideIndicator(id, delay);
    } else if (arguments.length == 4){
	hideIndicator(id, delay, fade);
    }
    reposIndicators();
}

function hideIndicator(id, delay, fade){
    var xIndicatorId = "xIndicator_" + String(id);
    var xIndicator = $('#'+xIndicatorId);

    if (arguments.length < 2){
	delay = 1000;
    }
    if (arguments.length < 3){
	fade = 1000;
    }

    if (xIndicator.lenth != 0){
	if (fade > 0){
	    setTimeout(function(){xIndicator.fadeOut(fade); reposIndicators();}, delay);
	}
	setTimeout(function(){xIndicator.remove(); reposIndicators();}, fade + delay);
    }
}

function doReblog(id, reblog_key, retry_num){
    var indicatorId = nextIndicatorId++;
    showIndicator(indicatorId, '<img src="./img/ajax-loader.gif" /> reblog');

    reblog_url = './ttt.cgi?method=reblog&id='+String(id)+'&reblog_key='+reblog_key
    
    if (!retry_num){
	retry_num = 50;
    }
    var error_handler = function(){
	showIndicator(indicatorId, "reblog failed. will retry " + retry_num + " times" , 9000, 1000);
	if (retry_num > 0){
	    setTimeout(function(){ doReblog(id, reblog_key, retry_num - 1); }, 10000);
	}
    }
    var ajax_params = { url: reblog_url,
			timeout: config.reblog_timeout,
			success: function(data){
			    eval(data);
			    if (result){
				showIndicator(indicatorId, "reblog done", 1000);
				// showIndicator(indicatorId, "reblog done");
				// hideIndicator(indicatorId);
			    } else {
				error_handler();
			    }
			},
			error: function(xhr, textStatus, err){
			    // dprint("reblog: ajax error handler called");
			    error_handler();
			}
		      };
    var request_opts = { timeout: config.reblog_timeout * 2,
			 error: function(){
			     // dprint("reblog: request error handler called");
			     error_handler();
			 }
		       };
    new Request(ajax_params, request_opts);
}

function reblog(){
    if (currentPostIdx >= 0){
	var reblog_key = postData[currentPostIdx]["reblog_key"];
	if (reblog_key){
	    doReblog(postData[currentPostIdx]["id"], reblog_key);
	} else {
	    var indicatorId = nextIndicatorId++;
	    showIndicator(indicatorId, "this is yours", 1000)
	}
	if (nextAfterReblog.checked) nextPost();
    }
}

function kaioken(){
    var level = parseInt($('#kaiokenLevel')[0].value);
    if (level < 10) level = 10;

    for(var i = 0;i < level; i++){
	reblog();
    }
}

function getUrlVars(){
    var vars = [], hash;
    if (window.location.href.indexOf('?') == -1){
	return {};
    }
    var hashes = window.location.href.slice(window.location.href.indexOf('?') + 1).split('&');
    for(var i = 0; i < hashes.length; i++){
        hash = hashes[i].split('=');
        vars[decodeURI(hash[0])] = decodeURI(hash[1]);
    }
    return vars;
}

function getBaseUrl(){
    if (window.location.href.indexOf('?') == -1){
	return window.location.href;
    }
    return window.location.href.slice(0, window.location.href.indexOf('?'));
}

function getPermalink(){
    var idx = currentPostIdx;
    if(currentPostIdx > 0){
	idx--;
    }
    offset = postData[idx].id;
    url = getBaseUrl() + "?offset=" + String(offset);
    if (highRes.checked) url += "&highres=true"
    if (skipPhoto.checked) url += "&skipphoto=true"
    if (skipMine.checked) url += "&skipmine=true"
    url += "&width=" + encodeURI($('#widthControl')[0].value);
    return url;
}

function refreshAction(){
    document.location.assign(getPermalink());
}

function setupTTT(){
//     $('#prevButton').bind('click', prevPost);
//     $('#nextButton').bind('click', nextPost);
//     $('#reblogButton').bind('click', reblog);
//     $('#kaiokenButton').bind('click', kaioken);

    $.fn.tap = function(fn){
	if (navigator.userAgent.match("iPhone")){
	    if (fn) {
		this.bind("touchstart", fn);
	    } else {
		this.trigger("touchstart");
	    }
	} else {
	    this.click(fn);
	}
    };

    if (navigator.userAgent.match("Chrome")){
	var controls_html = $('#controls').html();
	$('#controls').remove();
	$('.postWrapper').after(controls_html);
    }

    nextAfterReblog = $('#nextAfterReblog')[0]
    skipMine = $('#skipMine')[0];
    skipPhoto = $('#skipPhoto')[0];
    highRes = $('#highRes')[0];
    postUser = $('#currentPost > div.header > span.user')[0];
    postPermalink = $('#currentPost > div.footer > span.permalink > a')[0];
    postPhoto = $('#currentPost > div.photo')[0];
    postPhotoImg = $('#currentPost > div.photo > img')[0];
    postContent = $('#currentPost > div.content')[0];
    postInfo = $('#currentPost > div.footer > span.info')[0];
    strokeMode = $('#strokeMode')[0];

    $('#currentPost > div.photo > img').tap(function(){
	showPost(currentPostIdx, true);
    });

    // open new window if clicked
    $('#currentPost > div.footer > span.permalink > a').click(function(){
	window.open(this.href);
	return false;
    });

    highRes.onclick = function(){prefetchImages(currentPostIdx);}

    $('#prevButton').tap(prevPost);
    $('#nextButton').tap(nextPost);
    $('#reblogButton').tap(reblog);
    $('#kaiokenButton').click(kaioken);
    $('#refreshButton').click(refreshAction);

    if (navigator.userAgent.match("iPhone")){
	$('div.side-help')[0].style.display = "none";
	$('div.postWrapper')[0].style.padding = "0 10px";
    }

    var strokeId = 0;
    var showKeyStroke = function(msg){
	var thisStrokeId = "stroke"+(strokeId++);
	if (strokeMode.checked){
	    $("#home").append('<div class="stroke" id="'+thisStrokeId+'"><span>'+msg+'</span></div>');
	    var elemOjb = $('#'+thisStrokeId);
	    var elem = elemOjb[0];
	    var maxSize = window.innerHeight / 1.5;
	    if (maxSize * 5 > window.innerWidth){
		maxSize = window.innerWidth / 5;
	    }
	    var step = 10;
	    var fontSize = maxSize;
	    var top = window.innerHeight / 2 + document.body.scrollTop;
	    elem.style.lineHeight = maxSize + "px";
	    elem.style.fontSize = fontSize + "px";
	    elem.style.top = top + "px";
	    setTimeout(function(){
		var timer = setInterval(function(){
		    elem.style.fontSize = fontSize + "px";
		    elem.style.top = top + "px";
		    fontSize -= step;
		    top += step * 2;
		}, 50);
		elemOjb.fadeOut(800, function(){
		    clearInterval(timer);
		    elemOjb.remove();
		});
	    }, 30);
	}
    };
    $(document).keypress(function(evt){
	switch(evt.keyCode){
	case 32: // space
	    document.body.scrollTop += 100;
	    return false;
	    break;
	case 82: // r
	    showKeyStroke("R");
	    refreshAction();
	    break;
	case 104: // h
	    showKeyStroke("h: toggle");
	    highRes.checked = ! highRes.checked;
	    break;
	case 106: // j
	    showKeyStroke("j: next");
	    nextPost();
	    break;
	case 107: // k
	    showKeyStroke("k: prev");
	    prevPost();
	    break;
	case 115: // s
	    showKeyStroke("s: toggle");
	    skipPhoto.checked = ! skipPhoto.checked;
	    break;
	case 116: // t
	    showKeyStroke("t: reblog");
	    reblog();
	    break;
	case 118: // v
	    showKeyStroke("v: open");
	    post = postData[currentPostIdx];
	    window.open(post.permalink);
	    break;
	}
    });

    params = getUrlVars();
    if (params.highres == "true"){
	highRes.checked = true;
    }
    if (params.skipphoto == "true"){
	skipPhoto.checked = true;
    }
    if (params.skipmine == "true"){
	skipMine.checked = true;
    }
    if (params.width){
	$('#currentPost')[0].style.maxWidth = this.value;
	$('#widthControl')[0].value = params.widthControl;
    }

    if (params["offset"]) {
	loadPosts({offset: params["offset"]});
    } else {
	loadPosts();
    }

    $(window).scroll(reposIndicators);
    $(window).resize(reposIndicators);

    $('#widthControl').change(function(){
	$('#currentPost')[0].style.maxWidth = this.value;
    });

    if (navigator.userAgent.match("Chrome")){
	highRes.checked = "true";
    }

    setTimeout(scrollTo,500,0,1);
}

setupTTT();
reposIndicators();
