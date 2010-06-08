
// config

var config = {
    num: 50,
    prefetch_num: 100,
    prefetch_img_num: 10
}


// config end

var postData = [];
var currentPostIdx = -1;
var lastPostId = null;
var imgBuffer = [];

var nextIndicatorId = 0;
var skipPhoto = null;
var highRes = null;

// function prefetchImages(idx){
//     for(var idx in imgBuffer){
// 	imgBuffer[idx].src = null;
//     }
//     imgBuffer = null;
//     imgBuffer = [];
// 
//     for(var i = idx + 1;i < idx + config.prefetch_img_num + 1 && i < postData.length;i++){
// 	if (postData[i].type == "photo"){
// 	    var img = new Image();
// 	    img.src = postData[i].photo_url;
// 	    imgBuffer.push(img);
// 	}
//     }
// }

var preloadBuffers = []
function prefetchImages(idx){
    for(var i = 0;i < config.prefetch_img_num && i + idx + 1 < postData.length;i++){
	if (highRes.checked){
	    preloadBuffers[i].src = postData[i+idx+1].photo_url_large;
	} else {
	    preloadBuffers[i].src = postData[i+idx+1].photo_url;
	}
    }
}

var requestQueued = false;
function loadPosts(options){
    if (requestQueued) return;
    requestQueued = true;
    var query_str = ""
    if (options){
	var pairs = []
	for(var key in options){
	    pairs.push(encodeURI(String(key)) + "=" + encodeURI(String(options[key])));
	}
	if (pairs.length > 0){
	    query_str = "&" + pairs.join("&")
	}
    }
    $.ajax({
	url: './ttt.cgi?method=dashboard' + query_str,
	complete: function(){
	    requestQueued = false;
	    prefetchPosts();
	},
	success: function(data){
	    eval(data);
	    if (result){
		// success
		lastPostId = result[result.length - 1]["id"];
		postData = postData.concat(result);
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
	},
	error: function(){
	    setTimeout(loadPosts, 1000);
	}
    });
}

function prefetchPosts(force){
    if (force || (postData.length - currentPostIdx - 1 < config.prefetch_num)){
	var opt = {}
	if (lastPostId) opt = {offset: String(lastPostId)};
	loadPosts(opt);
    }
}

function showPost(idx){
    if (idx >= 0 && idx < postData.length){
	var imgs = $('#currentPost img');
	for(var i = 0;i < imgs.length;i++){
	    imgs[i].src = null;
	}

	$('#currentPost')[0].innerHTML = postData[idx].content;
	$('#currentPostIdx')[0].innerHTML = String(idx+1);

	if (postData[idx].type == "photo"){
	    if (highRes.checked){
		$('#currentPost > div.photo > img')[0].src = postData[idx].photo_url_large;
	    } else {
		$('#currentPost > div.photo > img').bind('click', function(){
		    this.src = null;
		    this.src = postData[idx].photo_url_large;
		});
	    }
	}

	// open new window if clicked
	$('#currentPost a').bind('click', function(){
	    window.open(this.href);
	    return false;
	});
    }
}

function prevPost(){
    var oldCurrentPostIdx = currentPostIdx;
    while(currentPostIdx > 0){
	currentPostIdx--;
	if (skipPhoto.checked && postData[currentPostIdx].type == "photo"){
	    continue;
	}
	showPost(currentPostIdx);
	return;
    }
    currentPostIdx = oldCurrentPostIdx;
}

function nextPost(){
    var oldCurrentPostIdx = currentPostIdx;
    while(currentPostIdx < postData.length - 1){
	currentPostIdx++;
	if (skipPhoto.checked && postData[currentPostIdx].type == "photo"){
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

function showIndicator(id, text, delay, fade){
    var xIndicatorId = "xIndicator_" + String(id);
    var xIndicator = $('#'+xIndicatorId);

    if (xIndicator.length == 0){
	$('#indicatorArea').append('<span class="indicator" id="'+xIndicatorId+
				  '">'+text+'</span>');
    } else {
	xIndicator = $('#'+xIndicatorId);
	xIndicator.html(text);
    }

    if (arguments.length == 3){
	hideIndicator(id, delay);
    } else if (arguments.length == 4){
	hideIndicator(id, delay, fade);
    }
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
	    setTimeout(function(){xIndicator.fadeOut(fade);}, delay);
	}
	setTimeout(function(){xIndicator.remove();}, fade + delay);
    }
}

function doReblog(id, reblog_key){
    var indicatorId = nextIndicatorId++;
    showIndicator(indicatorId, '<img src="./img/ajax-loader.gif" /> reblog');

    reblog_url = './ttt.cgi?method=reblog&id='+String(id)+'&reblog_key='+reblog_key
    
    var retry_num = 50;
    var error_handler = function(){
	showIndicator(indicatorId, "reblog failed. will retry", 1000);
	if (retry_num > 0){
	    setTimeout(function(){ doReblog(id, reblog_key); }, 10000);
	}
	retry_num--;
    }
    $.ajax({
	url: reblog_url,
	success: function(data){
	    eval(data);
	    if (result){
		showIndicator(indicatorId, "reblog done", 1000);
		// showIndicator(indicatorId, "reblog done");
		// hideIndicator(indicatorId);
	    }
	    else
		error_handler();
	},
	error: function(){
	    error_handler();
	}
    });
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
    }
}

function kaioken(){
    for(var i = 0;i < 10; i++){
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

function refreshAction(){
    var idx = currentPostIdx;
    if(currentPostIdx > 0){
	idx--;
    }
    offset = postData[idx].id;
    url = getBaseUrl() + "?offset=" + String(offset);
    if (highRes.checked) url += "&highres=true"
    if (skipPhoto.checked) url += "&skipphoto=true"
    document.location.assign(url);
    document.location.reload(true);
}

function setupTTT(){
//     $('#prevButton').bind('click', prevPost);
//     $('#nextButton').bind('click', nextPost);
//     $('#reblogButton').bind('click', reblog);
//     $('#kaiokenButton').bind('click', kaioken);

    skipPhoto = $('#skipPhoto')[0];
    highRes = $('#highRes')[0];

    highRes.onclick = function(){prefetchImages(currentPostIdx);}
    $('#prevButton')[0].onclick = prevPost;
    $('#nextButton')[0].onclick = nextPost;
    $('#prevButton')[0].ondblclick = prevPost;
    $('#nextButton')[0].ondblclick = nextPost;
    $('#reblogButton')[0].onclick = reblog;
    $('#kaiokenButton')[0].onclick = kaioken;
    $('#refreshButton')[0].onclick = refreshAction;

    for(var i = 0;i < config.prefetch_img_num;i++){
	$('#preloadBuffer').append('<img src=\"#\" />');
    }
    for(var i = 0;i < config.prefetch_img_num;i++){
	preloadBuffers[i] = $('#preloadBuffer img')[i];
    }

    params = getUrlVars();
    if (params.highres == "true"){
	highRes.checked = true;
    }
    if (params.skipphoto == "true"){
	skipPhoto.checked = true;
    }

    if (params["offset"]) {
	loadPosts({offset: params["offset"]});
    } else {
	loadPosts();
    }
}

setupTTT();