
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
	preloadBuffers[i].src = postData[i+idx+1].photo_url;
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
	    $('#currentPost > div.photo > img').bind('click', function(){
		this.src = null;
		this.src = postData[idx].photo_url_large;
	    });
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

function setupTTT(){
//     $('#prevButton').bind('click', prevPost);
//     $('#nextButton').bind('click', nextPost);
//     $('#reblogButton').bind('click', reblog);
//     $('#kaiokenButton').bind('click', kaioken);

    skipPhoto = $('#skipPhoto')[0].checked;

    $('#prevButton')[0].onclick = prevPost;
    $('#nextButton')[0].onclick = nextPost;
    $('#reblogButton')[0].onclick = reblog;
    $('#kaiokenButton')[0].onclick = kaioken;

    for(var i = 0;i < config.prefetch_img_num;i++){
	$('#preloadBuffer').append('<img src=\"#\" />');
    }
    for(var i = 0;i < config.prefetch_img_num;i++){
	preloadBuffers[i] = $('#preloadBuffer img')[i];
    }

    loadPosts();
}

setupTTT();