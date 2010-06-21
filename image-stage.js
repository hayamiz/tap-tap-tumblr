
var imageStageId = 0;
var ImageStage = function(postdata){
    var id = "stage"+imageStageId++;
    var tid = "tiles-"+id;
    var tcid = "tile-control-"+id;
    $(document.body).append('<div class="image-stage" id="'+id+'"></div>');
    $(document.body).append('<div class="tiles" id="'+tid+'"></div>');
    $(document.body).append('<div class="tile-controls" id="'+tcid+'">hoge</div>');
    var stage = $("#"+id);
    var tiles = $("#"+tid);
    var tileControl = $("#"+tcid);
    
    var stageElem = stage[0];
    var tilesElem = tiles[0];
    var tileControlElem = tileControl[0];
    stage.click(function(){ $("#"+tid).remove(); $("#"+id).remove(); $("#"+tcid).remove(); });
    tiles.click(function(){ $("#"+tid).remove(); $("#"+id).remove(); $("#"+tcid).remove(); });

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

    this.rownum = rownum;
    this.colnum = colnum;
    this.size = rownum * colnum;
    this.postdata = postdata;
    this.show = function(page){
	if (!page || page < 0) page = 0;
	for(var i = this.size * page, photonum = 0;
	    i < this.postdata.length && photonum < this.size;
	    i++){
	    if (postdata[i].type == "photo"){
		tiles.append('<div class="tile"><a><span><img src="'+postdata[i].photo_url_small+'" /></span></a></div>');
		photonum++;
	    }
	}
    }

    this.show(0);
}
