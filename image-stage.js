
var imageStageId = 0;
var ImageStage = function(postdata){
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

    // calculate size
    var tileWidth = 60;
    var padding = 10;
    var xmargin = 20;
    var ymargin = 20;
    var controlHeight = 40;
    var colnum = Math.floor((window.innerWidth - padding*2 - xmargin*2) / tileWidth);
    var rownum = Math.floor((window.innerHeight - padding*2 - ymargin*2 - controlHeight) / tileWidth);

    tilesElem.style.width = (colnum * 60) + "px";
    tilesElem.style.height = (rownum * 60) + "px";
    tileControlElem.style.width = (colnum * 60 + 10) + "px";

    stageElem.style.Left = 0;
    stageElem.style.top = 0;
    tilesElem.style.top = "20px";
    tilesElem.style.left = ((window.innerWidth - tilesElem.offsetWidth) / 2) + "px";
    tileControlElem.style.top = (20 + tilesElem.offsetHeight)+"px";
    tileControlElem.style.left = tilesElem.style.left;

    var close = function(){
	$("#"+tid).remove(); $("#"+id).remove(); $("#"+tcid).remove();
    }
    this.close = close;
    stage.click(close);
    tiles.click(close);

    this.rownum = rownum;
    this.colnum = colnum;
    this.size = rownum * colnum;
    for(var i = 0;i < postdata.length;i++){ postdata[i].idx = i; };
    this.postdata = postdata.filter(function(x){return x.type == "photo";});
    this.page = 0;
    this.pagenum = Math.ceil(this.postdata.length / this.size);
    $('#'+tcid+' > .total-page').html(''+this.pagenum);
    var self = this;
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

    this.show(0);
}
