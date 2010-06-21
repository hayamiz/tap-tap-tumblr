
var imageStageId = 0;
var ImageStage = function(postdata){
    var id = "stage"+imageStageId++;
    var tid = "tiles-"+id;
    var tcid = "tile-control-"+id;
    $(document.body).append('<div class="image-stage" id="'+id+'"></div>');
    $(document.body).append('<div class="tiles" id="'+tid+'"></div>');
    $(document.body).append('<div class="tile-controls" id="'+tcid+'"><a class="prev">&laquo;</a><a class="next">&raquo;</a></div>');
    var stage = $("#"+id);
    var tiles = $("#"+tid);
    var tileControl = $("#"+tcid);
    
    var stageElem = stage[0];
    var tilesElem = tiles[0];
    var tileControlElem = tileControl[0];

    // calculate size
    var colnum = Math.floor((window.innerWidth - 20) / 120);
    var rownum = Math.floor((window.innerHeight - 20 - 40 - 40) / 120);

    tilesElem.style.width = (colnum * 120) + "px";
    tilesElem.style.height = (rownum * 120) + "px";
    tileControlElem.style.width = tilesElem.style.width;
    tileControlElem.style.height = "20px";

    stageElem.style.Left = 0;
    stageElem.style.top = 0;
    tilesElem.style.top = "20px";
    tilesElem.style.left = ((window.innerWidth - tilesElem.offsetWidth) / 2) + "px";
    tileControlElem.style.top = (20 + tilesElem.offsetHeight)+"px";
    tileControlElem.style.left = tilesElem.style.left;

    var close = function(){
	$("#"+tid).remove(); $("#"+id).remove(); $("#"+tcid).remove();
    }
    stage.click(close);
    tiles.click(close);

    this.rownum = rownum;
    this.colnum = colnum;
    this.size = rownum * colnum;
    for(var i = 0;i < postdata.length;i++){ postdata[i].idx = i; };
    this.postdata = postdata.filter(function(x){return x.type == "photo";});
    this.page = 0;
    this.pagenum = Math.ceil(this.postdata.length / this.size);
    this.show = function(page){
	if (!page) page = this.page;
	if (page < 0) page = 0;
	if (page >= this.pagenum) page = this.pagenum - 1;
	this.page = page;

	for(var i = this.size * page;
	    i < this.postdata.length && i < this.size * (page + 1);
	    i++){
	    var post = this.postdata[i];
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
    this.nextPage = function(){
	this.show(this.page + 1);
    }
    this.prevPage = function(){
	this.show(this.page - 1);
    }

    this.show(0);
}
