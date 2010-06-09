
var Request = function(ajax_params, opts){
    var defaults = {
	startTime: null,
	ajaxParams: ajax_params,
	error: function(){},
	ensure: function(){},
	timeout: 10*1000,
	poll_interval: 1000,
    };

    $.extend(defaults, opts);
    var startTime = (new Date()).getTime();

    var completed = false;

    if (defaults.ajaxParams.complete){
	var original_complete = defaults.ajaxParams.complete;
	defaults.ajaxParams.complete = function(xhr, ts){
	    completed = true;
	    original_complete(xhr, ts);
	}
    } else {
	defaults.ajaxParams.complete = function(){
	    completed = true;
	}
    }

    var poll = function(){
	if (completed) {
	    defaults.ensure();
	    return; // stop polling
	}
	if (startTime + defaults.timeout < (new Date()).getTime()){ // timeout
	    defaults.error();
	    defaults.ensure();
	    return; // stop polling
	}
	setTimeout(poll, defaults.poll_interval);
    };

    $.ajax(defaults.ajaxParams);
    poll();
}
