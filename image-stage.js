
var cssTileRule;
var cssTileAnchorRule;
var cssTileSpanRule;
var cssTileImageRule;
for(var i = 0;i < document.styleSheets.length;i++){
    var ss = document.styleSheets[i];
    for(var j = 0;j < ss.cssRules.length;j++){
	var rule = ss.cssRules[j];
	if (rule.selectorText == "div.tiles > div.tile"){
	    cssTileRule = rule;
	} else if (rule.selectorText == "div.tiles > div.tile > a"){
	    cssTileAnchorRule = rule;
	} else if (rule.selectorText == "div.tiles > div.tile > a > span"){
	    cssTileSpanRule = rule;
	} else if (rule.selectorText == "div.tiles > div.tile img"){
	    cssTileImageRule = rule;
	}
    }
}


var imageStageId = 0;
var ImageStage = function(postdata, curidx){
    var self = this;
    if (!curidx) curidx = 0;

    var id = "stage"+imageStageId++;
    var tid = "tiles-"+id;
    var tcid = "tile-control-"+id;
    $(document.body).append('<div class="image-stage" id="'+id+'"></div>');
    $(document.body).append('<div class="tiles" id="'+tid+'"></div>');
    $(document.body).append('<div class="tile-controls" id="'+tcid+'"><span class="current-page">1</span>/<span class="total-page"></span><a class="prev"><span>&#9650;</span></a><a class="next"><span>&#9650;</span></a></div>');
    var stage = $("#"+id);
    var tiles = $("#"+tid);
    var tileControl = $("#"+tcid);
    
    var stageElem = stage[0];
    var tilesElem = tiles[0];
    var tileControlElem = tileControl[0];

    // setup tile size
    var tileSize = 60;
    var tileBorderSize = 5;
    if (!navigator.userAgent.match("iPhone")){
	tileSize = 100;
	cssTileRule.style.width = tileSize + "px";
	cssTileRule.style.height = tileSize + "px";

	cssTileAnchorRule.style.width = tileSize + "px";
	cssTileAnchorRule.style.height = tileSize + "px";

	cssTileSpanRule.style.top = tileBorderSize + "px";
	cssTileSpanRule.style.left = tileBorderSize + "px";
	cssTileSpanRule.style.width = (tileSize - tileBorderSize*2) + "px";
	cssTileSpanRule.style.height = (tileSize - tileBorderSize*2) + "px";

	cssTileImageRule.style.width = (tileSize - tileBorderSize*2) + "px";
    }

    // calculate size
    var padding = 10;
    var xmargin = 20;
    var ymargin = 20;
    var controlHeight = 40;
    var colnum = Math.floor((window.innerWidth - padding*2 - xmargin*2) / tileSize);
    var rownum = Math.floor((window.innerHeight - padding*2 - ymargin*2 - controlHeight) / tileSize);

    tilesElem.style.width = (colnum * tileSize) + "px";
    tilesElem.style.height = (rownum * tileSize) + "px";
    tileControlElem.style.width = (colnum * tileSize + 10) + "px";

    stageElem.style.Left = 0;
    stageElem.style.top = 0;
    tilesElem.style.top = "20px";
    tilesElem.style.left = ((window.innerWidth - tilesElem.offsetWidth) / 2) + "px";
    tileControlElem.style.top = (20 + tilesElem.offsetHeight)+"px";
    tileControlElem.style.left = tilesElem.style.left;

    this.closed = false;
    var close = function(){
	$("#"+tid).remove(); $("#"+id).remove(); $("#"+tcid).remove();
	self.closed = true;
    }
    this.close = close;
    stage.click(close);
    tiles.click(close);

    this.rownum = rownum;
    this.colnum = colnum;
    this.size = rownum * colnum;
    for(var i = 0;i < postdata.length;i++){ postdata[i].idx = i; };
    this.postdata = postdata.filter(function(x){return x.type == "photo";});
    if (skipMine && skipMine.checked){
	this.postdata = this.postdata.filter(function(x){return x["reblog_key"];});
    }
    if (this.postdata.length == 0){
	this.close();
	return this;
    }
    this.page = 0;
    this.pagenum = Math.ceil(this.postdata.length / this.size);
    $('#'+tcid+' > .total-page').html(''+this.pagenum);
    var show = function(page){
	if (page != 0 && !page) page = self.page;
	if (page < 0) page = 0;
	if (page >= self.pagenum) page = self.pagenum - 1;
	self.page = page;
	$('#'+tcid+' > .current-page').html(page + 1);

	tiles.html("");
	for(var i = self.size * page;
	    i < self.postdata.length && i < self.size * (page + 1);
	    i++){
	    var post = self.postdata[i];
	    tiles.append('<div id="tile'+i+'" class="tile"><a><span><img src="'+post.photo_url_small+'" /></span></a></div>');
	    (function(i, postidx){
		$("#tile"+i+" > a").click(function(){
		    close();
		    currentPostIdx = postidx;
		    showPost(postidx);
		});
	    })(i, post.idx);
	}
    }
    this.show = show;
    this.nextPage = function(){
	show(self.page + 1);
    }
    this.prevPage = function(){
	show(self.page - 1);
    }
    $('#'+tcid+' > .prev').click(this.prevPage);
    $('#'+tcid+' > .next').click(this.nextPage);

    var curpage = 0;
    if (curidx > 0){
	for(var page = 0;page < this.pagenum;page++){
	    if (this.postdata[page * this.size].idx <= curidx){
		curpage = page;
	    } else {
		break;
	    }
	}
    }
    this.show(curpage);
}
