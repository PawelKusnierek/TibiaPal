// Fiend Map Tool - Combined JavaScript
// All classes and functionality for the Fiend Hunter Map tool

// ============================================================================
// common.js - Point and LinkedPoint classes
// ============================================================================

class Point {
    constructor(x, y) {
        this.x = (Math.round((x + Number.EPSILON) * 100) / 100);
        this.y = (Math.round((y + Number.EPSILON) * 100) / 100);
    }

    compare(other){
        if(this.x == other.x && this.y == other.y){return true;}
        return false;
    }
    copy(){
        return new Point(this.x, this.y);
    }
    round()
    {
        this.x = Math.round(this.x);
        this.y = Math.round(this.y);
        return this;
    }
}

class LinkedPoint extends Point{

    constructor(x, y) {
        super(x,y);
    }

    cleanInternal(){
        this.discarded = false;
        this.intersection = null;
        this.prev = null;
        this.next = null;
        this.visited = false;
    }
    
    copy(){
        return new LinkedPoint(this.x, this.y);
    }
}

// ============================================================================
// places.js - Coordinate conversion and named places
// ============================================================================

const places = {
	'Thais Ship': {x: 32310, y:32211},
	'Venore Ship': {x: 32955, y: 32022},
	'Svargrond Ship': {x: 32342, y: 31109},
	'Yalahar Ship' : {x:32818, y:31273},
	'Carlin Ship' : {x:32388, y:31822},
	'Ab\'dendriel Ship' : {x:32735, y:31670},
	'Meriana Ship' : {x:32346, y:32622},
	'Liberty Bay Ship' : {x:32286, y:32891},
	'Port Hope Ship' : {x:32531, y:32785},
	'Ankrahmun Ship' : {x:33093, y:32884},
	'Darashia Ship' : {x:33290, y:32482},
	'Oramond Ship' : {x:33483, y:31986},
	'Cormaya Ship' : {x:33289, y:31957},
	'Edron Ship' : {x:33176, y:31765},
	'Krailos Ship' : {x:33492, y:31713},
	'Vengoth Boat' : {x:32857, y:31550},
	'Kazordoon Carpet' : {x:32590, y:31943},
	'Darashia Carpet' : {x:33269, y:32442},
	'Fermor Hills Carpet' : {x:32535, y:31838},
	'Zao Carpet' : {x:32985, y:31540},
	'Svargrond Carpet' : {x:32253, y:31099},
	'Issavi Carpet' : {x:33959, y:31515},
};

function toTibiaCoord(point)
{
	let ret = point.copy();
	ret.x += 31744;
	ret.y += 30976;
	return ret;
}

function fromTibiaCoord(point){
	let ret = point.copy();
	ret.x -= 31744;
	ret.y -= 30976;
	return ret;
}

function getValues(key){
	if (key in places) {
        return new Point (places[key].x, places[key].y);
    }
	const match = key.match(/^\((\d{5})\s*,\s*(\d{5})\)$/);
    if (match) {
        return new Point (parseInt(match[1], 10), parseInt(match[2], 10));
    }
    return null;
}

// ============================================================================
// draw.js - SVG drawing classes
// ============================================================================

class SVGCross{
    #lineh;
    #linev;
    #xsize;
    #ysize;
    constructor(container, xsize, ysize){
        this.#lineh = new SVGLine(container);
        this.#linev = new SVGLine(container);
        this.#xsize = xsize;
        this.#ysize = ysize;
        this.drawed = false;
    }

    setWidth(width){
        this.#lineh.setWidth(width);
        this.#linev.setWidth(width);
    }

    draw(p){
        this.point =p;
        this.drawed = true;;
        let ph1 = new Point(0,p.y-0.5);
        let ph2 = new Point(this.#xsize, p.y-0.5);
        let pv1 = new Point(p.x-0.5, 0);
        let pv2 = new Point(p.x-0.5, this.#ysize);
        this.hide();
        this.#lineh.draw(ph1,ph2);
        this.#linev.draw(pv1,pv2);
        this.show();
    }

    toggle(){
        if(this.visible){
            return this.hide();
        }
        return this.show();
    }

    hide()
    {
        this.visible = false;
        this.#linev.hide();
        this.#lineh.hide();
    }

    show()
    {
        this.visible = true;
        this.#linev.show();
        this.#lineh.show();
    }
}

class SVGLine{
    #svg;
    constructor(container)
    {
        this.#svg = document.createElementNS("http://www.w3.org/2000/svg", "line");
	    container.appendChild(this.#svg);
        this.color='black'
    }

    draw(p1,p2){
        this.#svg.setAttribute('x1', p1.x);
        this.#svg.setAttribute('y1', p1.y);
        this.#svg.setAttribute('x2', p2.x);
        this.#svg.setAttribute('y2', p2.y);
    }

    hide()
    {
        this.#svg.setAttribute('stroke', 'none');
    }

    show()
    {
        this.#svg.setAttribute('stroke', this.color);
    }

    setWidth(width){
        this.#svg.setAttribute('stroke-width', width);
    }
}

class SVGPolygon{
    #svg;
    #container;
    constructor(container)
    {
        this.#container = container;
        this.#svg = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
        this.#container.appendChild(this.#svg);
        this.hide();
    }

    setFillColor(color){
        this.fill = color;
        this.#svg.setAttribute('fill', color);
    }

    setStrokeColor(color){
        this.color = color;
        this.#svg.setAttribute('stroke', color);
    }

    setOpacity(percentage){
        this.#svg.setAttribute('opacity', (percentage)/100);
    }

    setFillOpacity(percentage){
        this.#svg.setAttribute('fill-opacity', (percentage)/100);
    }

    destroy(){
        this.#container.removeChild(this.#svg);
        this.#svg = null;
    }

    draw(points){
        let sp = "";
        let p = points[0];
        for (let i=0; i<points.length; i++)
            {
                sp += `${p.x},${p.y}`;
                p = p.next;
                if(i<points.length - 1){sp += " ";}
            }
		this.#svg.setAttribute('points', sp);
    }

    hide()
    {
        this.#svg.setAttribute('stroke', 'none');
        this.#svg.setAttribute('fill', 'none');
    }

    show()
    {
        this.#svg.setAttribute('stroke', this.color);
        this.#svg.setAttribute('fill', this.fill);
    }
}

// ============================================================================
// isobutton.js - IsoButton class
// ============================================================================

class IsoButton {

constructor(containerid) {
    this.id = containerid;
 }  


init(callback){

	const buttons = document.querySelectorAll('#'+this.id+' button');

	buttons.forEach(button => {
	button.addEventListener('click', () => {
	  buttons.forEach(btn => btn.classList.remove('active'));
	  button.classList.add('active');
	  if(callback)callback();
	});
	});
		  
}

click(value){
	const container = document.getElementById(this.id);
	if (!container) return;

    const button = container.querySelector(`button[data-value="${value}"]`);
	if (button) {
      button.click();
    }
}

resetChoosen(){
	const buttons = document.querySelectorAll('#'+this.id+' button');
	buttons.forEach(button => {button.classList.remove('active')});
}

isSet(){
	const buttons = document.querySelectorAll('#'+this.id+' button.active');
	if(buttons.length == 1) return true;
	return false;
}

getValue(){
	const button = document.querySelector(`#${this.id} button.active`);
    return button?.dataset.value;
}

}

// ============================================================================
// coordpicker.js - CoordPicker class
// ============================================================================

class CoordPicker {
    #point;
    #callback;
    #value;
    constructor() {
        // No DOM input needed - coordinates stored internally
    }
    
    init(callback) {
        this.#callback = callback;
        this.resetChoosen();
    }
    
    rightClickHandler(point){
		point.round();
		if(this.#point != null && this.#point.compare(point))
        {
			this.resetChoosen();
            this.#point = null;
		}
		else{
			let tp = toTibiaCoord(point);
			this.setValue("("+tp.x+", "+tp.y+")");
            this.#point = point;
		}
		
	}

    internalcallback() {
        if (this.#callback) this.#callback();
    }

    resetChoosen(){
        this.#value = "";
        this.#point = null;
        this.internalcallback();
    }

    isSet(){
        return !!(this.#value && this.#value.trim() !== "");
    }

    setValue(val){
        this.#value = val;
        this.internalcallback();
    }

    getRawValue(){
        return this.#value || "";
    }

    getValue() {
        let result = {};
        let raw = this.getRawValue();
        if (raw == "") return null; 
        result.name = null;
        result.point = getValues(raw);
        if(result.point == null) return null;
        return result;
    }
}

// ============================================================================
// map.js - Map class
// ============================================================================

class TibiaMap {

constructor(containerid) {
    this.container=document.getElementById(containerid);
}  

static zoomLvls = [0.25,0.5,1,2,4,8,16];
static crossWidth = [4,4,2,1,1,1,1];

zoomIdx = TibiaMap.zoomLvls.indexOf(1); 
minZoom = TibiaMap.zoomLvls[0];
gridSizeX = 0;
gridSizeY = 0;
point = null;
#cross; 

imageStore = [];scale = 1; isDragging = false;originX = 0; originY =0; startX = 0; startY = 0;container;mapWrapper;floorloaded = -1; moveCallabck = null; #clickCallback = null; #hasMoved = false; currentFloor = 0; #floorDisplayButton = null;

init()
{	
	this.container.classList.add("tibia-map");

	//create buttons
	const buttons = document.createElement("div");
	buttons.id = this.container.id + "-buttons";
	buttons.classList.add("tibia-map-button-container");
	this.container.appendChild(buttons);
	
	// Up arrow button
	const upButton = document.createElement("button");
	upButton.id = "button-floor-up";
	upButton.textContent = "▲";
	upButton.disabled = true;
	upButton.classList.add("tibia-map-button");
	upButton.addEventListener('click', () => {
		this.goUpOneFloor();
	});
	buttons.appendChild(upButton);
	
	// Current floor display button
	const floorDisplayButton = document.createElement("button");
	floorDisplayButton.id = "button-floor-display";
	floorDisplayButton.textContent = "0";
	floorDisplayButton.classList.add("tibia-map-button");
	floorDisplayButton.classList.add("tibia-map-button-highlight");
	this.#floorDisplayButton = floorDisplayButton;
	buttons.appendChild(floorDisplayButton);
	
	// Down arrow button
	const downButton = document.createElement("button");
	downButton.id = "button-floor-down";
	downButton.textContent = "▼";
	downButton.disabled = true;
	downButton.classList.add("tibia-map-button");
	downButton.addEventListener('click', () => {
		this.goDownOneFloor();
	});
	buttons.appendChild(downButton);

	//create map wrapper; this is where zoom and pan happens
	const wrapper = document.createElement("div");
	wrapper.id = this.container.id + "-wrapper";
	wrapper.classList.add("tibia-map-wrapper");
	this.container.appendChild(wrapper);
	this.mapWrapper = wrapper;
	
	//grid contains the tile (currently just one big image)
	const grid = document.createElement("div");
	grid.id = this.container.id + "-grid";
	grid.classList.add("tibia-map-grid");
	wrapper.appendChild(grid);

	//add svg overlay 
	const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
	svg.id = this.container.id + "-svg";
	svg.classList.add("tibia-map-svg");
	wrapper.appendChild(svg);

	//tryload images into image store, starting from index 7 (ground floor)
	//to get faster initial display time

	let loadedCount = 0;
	for (let j = 0; j < 16; j++) {
		const i = (7 + j) % 16;
		const img = new Image();
		img.crossOrigin = "anonymous";
		img.src = `images/minimap/f${i}.png`;
		img.addEventListener('load', ()  => {
			this.imageStore[i] = img.src;
			loadedCount ++;
			if (i === 7) {
				//take map size from ground floor image 
				this.gridSizeX = img.width;
				this.gridSizeY = img.height;
				const grid = document.querySelector('.tibia-map-grid');
				grid.style.width = `${img.width}px`;
				grid.style.height = `${img.height}px`;
				const svg = document.querySelector('.tibia-map-svg');
				svg.style.width = `${img.width}px`;
				svg.style.height = `${img.height}px`;
				//initial load of ground floor
				this.loadFloor(7);
				this.#configurePTPZoom();
				this.#cross = new SVGCross(svg, img.width, img.height);
				this.#cross.setWidth(TibiaMap.crossWidth[this.zoomIdx]);
				this.mapWrapper.addEventListener('contextmenu', (e) => {
					e.preventDefault();
					let point = this.#getMouseCoordMap(e).round();
					if(this.point != null && point.compare(this.point) == true){
						this.point = null;
						this.#cross.hide();
					}
					else{
						this.#cross.draw(point);
					    this.point = point;
					}
				});
				// Single click handler for coordinate selection
				this.mapWrapper.addEventListener('click', (e) => {
					if (this.#hasMoved) {
						this.#hasMoved = false;
						return; // Don't handle click if user was dragging
					}					
					e.preventDefault();
					let pointUnrounded = this.#getMouseCoordMap(e);
					let point = pointUnrounded.round();
					// Always set (no toggle) to avoid flicker / undo on double-click.
					this.#cross.draw(point);
					this.point = point;
					// Call the callback with unrounded point (matching registerCallback behavior)
					// The callback (rightClickHandler) will round it internally
					if(this.#clickCallback) {
						this.#clickCallback(pointUnrounded);
					}
				});
				// Double click handler for zooming
				this.mapWrapper.addEventListener('dblclick', (e) => {
					e.preventDefault();
					let point = this.#getMouseCoordMap(e);
					let view = this.#getMouseCoordViewPort(e);
					// Zoom in
					if(this.#manageScale(true)) {
						this.#movePointToPoint(view, point);
						this.#applyNewCoords(true);
					}
				});
			}
			if (loadedCount === 16) {
				//when all images loaded, enable navigation buttons (but keep floor display disabled)
				const upButton = document.getElementById('button-floor-up');
				const downButton = document.getElementById('button-floor-down');
				if (upButton) upButton.disabled = false;
				if (downButton) downButton.disabled = false;
			}
		});
	}
	
	this.mapWrapper.addEventListener('mousedown', (e) => {
            e.preventDefault();
            this.isDragging = true;
            this.#hasMoved = false;
            this.startX = e.clientX;
            this.startY = e.clientY;
            this.container.style.cursor = "grabbing";
	});

	document.addEventListener('mousemove', (e) => {
				if (!this.isDragging) return;
				let dx = e.clientX - this.startX;
				let dy = e.clientY - this.startY;
				// Track if mouse moved significantly (more than 5 pixels)
				if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
					this.#hasMoved = true;
				}
				this.originX = this.originX - dx;
				this.originY = this.originY - dy;
				this.startX = e.clientX;
				this.startY = e.clientY;
				this.#applyNewCoords(false); 
	});

	document.addEventListener('mouseup', (e) => {
				this.isDragging = false;
				this.container.style.cursor = "default";
	});
	


}



loadFloor(imageIndex) {
	let grid = document.getElementById("tibia-map-grid");
	grid.innerHTML = ""; // Clear existing tile
	let tile = document.createElement('div');

    tile.className = 'tibia-map-tile';
	if( imageIndex in this.imageStore){
		tile.style.backgroundImage = `url('${this.imageStore[imageIndex]}')`;
	}
    grid.appendChild(tile);
	this.floorloaded = imageIndex;
	// Update current floor number (imageIndex 7 = floor 0)
	this.currentFloor = 7 - imageIndex;
	// Update floor display button
	if(this.#floorDisplayButton) {
		this.#floorDisplayButton.textContent = this.currentFloor.toString();
	}
}

goUpOneFloor() {
	// Floor 0 = imageIndex 7, Floor 1 = imageIndex 6, etc.
	// Formula: imageIndex = 7 - floorNumber
	const newFloor = this.currentFloor + 1;
	const maxFloor = 7; // Can go up to floor 7
	if (newFloor <= maxFloor) {
		const imageIndex = 7 - newFloor;
		if (imageIndex >= 0 && imageIndex < 16) {
			this.loadFloor(imageIndex);
		}
	}
}

goDownOneFloor() {
	// Floor 0 = imageIndex 7, Floor -1 = imageIndex 8, etc.
	// Formula: imageIndex = 7 - floorNumber
	const newFloor = this.currentFloor - 1;
	const minFloor = -7; // Can go down to floor -7
	if (newFloor >= minFloor) {
		const imageIndex = 7 - newFloor;
		if (imageIndex >= 0 && imageIndex < 16) {
			this.loadFloor(imageIndex);
		}
	}
}

getFloorLoaded() {
	return this.currentFloor;
}

#configurePTPZoom() {
	this.mapWrapper.addEventListener('wheel', (e) =>this.#ZoomPointToPoint(e));
}

#applyNewCoords(smooth) {
	if(smooth){		
		this.mapWrapper.style.transition = "transform 0.3s ease-out";
	}
	else
	{
		this.mapWrapper.style.transition = "";
	}
	const minX = 0;
	const maxX = this.gridSizeX*this.scale - this.container.clientWidth;
	const maxY = this.gridSizeY*this.scale - this.container.clientHeight;

    this.originX = Math.max(minX, Math.min(maxX, this.originX));
    this.originY = Math.max(minX, Math.min(maxY, this.originY));

	this.mapWrapper.style.transform = `translate(${-this.originX}px, ${-this.originY}px) scale(${this.scale})`;
	
}

#manageScale(zoomIn){
	this.minZoom = Math.max(this.container.clientWidth/(this.gridSizeX),this.container.clientHeight/(this.gridSizeY));
	if(zoomIn)
	{
		this.zoomIdx++;
	}
	else
	{
		this.zoomIdx--;
	}
	this.zoomIdx = Math.max(0, Math.min(this.zoomIdx, TibiaMap.zoomLvls.length-1));
	let newScale = Math.max(this.minZoom, TibiaMap.zoomLvls[this.zoomIdx]); 
	this.#cross.setWidth(TibiaMap.crossWidth[this.zoomIdx]);
	if(newScale==this.scale) return false;
	this.scale = newScale;
	return true;
}


#ZoomPointToPoint(e) {
	e.preventDefault();
	let point = this.#getMouseCoordMap(e);
	let view = this.#getMouseCoordViewPort(e);
	if(this.#manageScale(e.deltaY<0))
	{
		this.#movePointToPoint(view, point);
		this.#applyNewCoords(true);
	}		
}

#getMouseCoordViewPort(e){
	const rect = this.container.getBoundingClientRect();
	const x = (e.clientX  - rect.left); // X position relative to the element
	const y = (e.clientY  - rect.top); // Y position relative to the element
	return new Point(x, y);
}

#getMouseCoordMap(e){
	const rect = this.container.getBoundingClientRect();
	const x = this.originX/this.scale + (e.clientX  - rect.left)/this.scale; // X position relative to the element
	const y = this.originY/this.scale + (e.clientY  - rect.top)/this.scale; // Y position relative to the element
	return new Point(x, y);
}

#movePointToPoint(viewport, point)
{
	this.originX = point.x*this.scale - viewport.x;
	this.originY = point.y*this.scale - viewport.y;
}

getSvgContainer()
{
	const svg = document.getElementById(this.container.id + '-svg');
	return svg;
}

hideCross()
{
	this.#cross.hide();
}

registerCallback(callback)
{
	this.mapWrapper.addEventListener('contextmenu', (e) => {
		e.preventDefault();
		if(callback) callback(this.#getMouseCoordMap(e));
	});
	this.#clickCallback = callback;
}
}

// ============================================================================
// polygons.js - Polygon classes
// ============================================================================

class PolygonIntersector {
    constructor(poly1, poly2){
        this.poly1=poly1.copy();
        this.poly2=poly2.copy();
    }

    doMagic(){
        this.#intersects();
        this.#checkPointsIfInBoth();
        this.#discardDetached();
        return this.#combine();
    }
    
    #intersects()
    {
        let p = this.poly1.points[0];
        let i=0;
        while(i<this.poly1.points.length){
            let advance = true;
            let edge = new Edge(p, p.next);
            let op = this.poly2.points[0];
            for(let j=0; j<this.poly2.points.length; j++){
                let otheredge = new Edge(op, op.next);
                let point = edge.intersects(otheredge);
                if(point != null){
                    let addedPoint1=this.poly1.contains(point);
                    let addedPoint2=this.poly2.contains(point);
                    if(addedPoint1 ==null){
                        addedPoint1 = this.poly1.addPoint(point, p, true);
                        advance = false;
                    }
                    if(addedPoint2==null){
                        addedPoint2 = this.poly2.addPoint(point, op, true);
                        advance = false;
                    }
                    if(!advance){
                        addedPoint1.intersection = addedPoint2;
                        addedPoint2.intersection = addedPoint1;
                    }
                    else break;
                }
                op=op.next;


            }
            if(advance){
                p=p.next;
                i++;
            }
        }
        
    }

    #checkPointsIfInBoth(){
        for(let i=0; i<this.poly1.points.length; i++){
            this.poly1.points[i].discarded = !this.poly2.isPointInside(this.poly1.points[i]);
        }
        for(let i=0; i<this.poly2.points.length; i++){
            this.poly2.points[i].discarded = !this.poly1.isPointInside(this.poly2.points[i]);
        }
    }

    #discardDetached(){
        //finds single detached points of overlap (verticies touching, other verticies on edge)
        for(let i=0; i<this.poly1.points.length; i++){
            if(this.poly1.points[i].next.discarded == true && this.poly1.points[i].prev.discarded == true){
                this.poly1.points[i].discarded = true;
            }
        }
        for(let i=0; i<this.poly2.points.length; i++){
            if(this.poly2.points[i].next.discarded == true && this.poly2.points[i].prev.discarded == true){
                this.poly2.points[i].discarded = true;
            }
        }
    }

    #countNotDiscarded(poly){
        let goodPointsCount = 0;
        for(let i=0; i<poly.points.length; i++){
            if(poly.points[i].discarded == false){
                goodPointsCount++;
            }
        }
        return goodPointsCount;
    }

    #isAllDiscarded(poly){
        return this.#countNotDiscarded(poly) == 0;
    }

    #isNoneDiscarded(poly){
        return this.#countNotDiscarded(poly) == poly.points.length;
    }

    #combine(){
        let poly1discarded = this.#isAllDiscarded(this.poly1);
        let poly2discarded = this.#isAllDiscarded(this.poly2);
        if(poly1discarded && poly2discarded){return null;}
        else if(poly1discarded || this.#isNoneDiscarded(this.poly2)){return new IntersectionPolygon(this.poly2.getPoints());}
        else if(poly2discarded || this.#isNoneDiscarded(this.poly1)){return new IntersectionPolygon(this.poly1.getPoints());}
        let startingPoly = this.poly1;
        if(this.#countNotDiscarded(this.poly2) > this.#countNotDiscarded(this.poly1))
        {
            startingPoly = this.poly2;
        }

        let result = [];
        for(let i=0; i<startingPoly.points.length; i++){
            if(startingPoly.points[i].discarded != true){
                result.push(startingPoly.points[i]);
                break;
            }
        }
        if(result.length==0){
            return null;
        }
        let start = result[0];
        let element = this.#determineNextElement(start);
    
        do{
            result.push(element);
            element = this.#determineNextElement(element);
        }while(!start.compare(element))

        if(result.length < 3){
            return null;
        }
        let poly = new IntersectionPolygon(result);
        return poly;

    }

    #determineNextElement(p){
        p.visited = true;
        if(p.intersection != null) p = p.intersection;
        if(!p.next.discarded) return p.next;
        if(!p.prev.discarded) return p.prev;
    }

}


class Polygon {

    #svg;
    constructor(){
        this.origin = [];
        this.points = [];
    }

    copy(){
        let copy = new Polygon();
        copy.points = this.getPoints();
        copy.linkPoints();
        return copy;
    }

    destroy(){
        this.points.length = 0;
        this.#svg.destroy();
        this.#svg = null;
    }

    getPoints(){
        let copy = [];
        for (let i=0; i<this.points.length; i++)
        {
            copy.push(this.points[i].copy());
        }
        return copy;
    }
    
    getPointsString(){
        let start = this.points[0];
        let result = "[";
        let p= start.next;
        for (let i=0; i<this.points.length; i++)
        {
            result += `(${p.x},${p.y})`;
            p = p.next;
            if(i<this.points.length - 1){result += ", ";}
        }
        result += "]";
        return result;
    }
    
    linkPoints()
    {
        for (let i = 0; i < this.points.length; i++) {
          this.points[i].cleanInternal();
          this.points[i].prev = this.points[(i - 1 + this.points.length) % this.points.length];
          this.points[i].next = this.points[(i + 1) % this.points.length];
        }
    }

    addPoint(point, after)
    {
        let found = -1;
        for(let i = 0; i< this.points.length; i++)
        {
            if (this.points[i] === after) {
                found = i;
                break;
            }
        } 
        if(found == -1)return null;
        let np = new LinkedPoint(point.x, point.y);
        np.prev = this.points[found];
        np.next = this.points[found].next;
        np.next.prev = np;
        this.points[found].next = np;
        this.points.push(np);
        return np;
    }

    isPointInside(point){
        const px = point.x;
        const py = point.y;
        let inside = false;
        let start = this.points[0];
        for (let i = 0; i< this.points.length; i++) {
            let p1 = start;
            let p2 = start.next;
            let edge = new Edge(p1,p2);
            if(edge.contains(point)){return true;}
            const intersect = ((p1.y > py) !== (p2.y > py)) &&
                              (px < (p2.x - p1.x) * (py - p1.y) / (p2.y - p1.y) + p1.x);
    
            if (intersect) inside = !inside;
            start = start.next;
        }
        
        return inside;
    }
    
    contains(point){
        for(let i=0; i<this.points.length; i++){
            if(this.points[i].x == point.x &&
                this.points[i].y == point.y){
                    return this.points[i];
                }
        }
        return null;
    }
}

class Edge {
    constructor(S,E){
        this.S = S;
        this.E = E;
    }

    intersects(other){
        let { x: x1, y: y1 } = this.S;
        let { x: x2, y: y2 } = this.E;

        let { x: x3, y: y3 } = other.S;
        let { x: x4, y: y4 } = other.E;

        let d = (x4 - x3) * (y2 - y1) - (y4 - y3) * (x2 - x1);
        if (d == 0) return null; //pararell

        let a = (x4 - x3) * (y3 - y1) - (y4 - y3) * (x3 - x1) ;
        if (a == 0) return null //ovelaping
        let b = (x2 - x1) * (y3 - y1) - (y2 - y1) * (x3 - x1) ;

        if ((a/d) >= 0 && (a/d) <= 1 && (b/d) >= 0 && (b/d) <= 1) {
            let intersectionX = x1 + (a/d) * (x2 - x1);
            let intersectionY = y1 + (a/d) * (y2 - y1);
            return new LinkedPoint(intersectionX,intersectionY);
        }
        return null;
    }

    contains(point){
        if(point.x <= Math.max(this.S.x, this.E.x) &&
            point.x >= Math.min(this.S.x, this.E.x) &&
            point.y <= Math.max(this.S.y, this.E.y) && 
            point.y >= Math.min(this.S.y, this.E.y) &&
            (point.x-this.S.x)*(this.E.y-this.S.y) == 
            (point.y-this.S.y)*(this.E.x-this.S.x)){
                return true;
        }
        return false;
    }
}

class IntersectionPolygon extends Polygon {
    constructor(points){
        super();
        this.points = points;
        this.linkPoints();
    }

    getAvgPont(){
        let x = 0;
        let y = 0;
        for(let i=0; i<this.points.length; i++){
            x+=this.points[i].x;
            y+=this.points[i].y;
        }
        return new Point(x/this.points.length, y/this.points.length);
    }
}

class ExivaPolygon extends Polygon{
	constructor(dist, dir, point){
		super();
		this.distance = dist;
		this.direction = dir;
		this.point = point;
		this.#getbaseshape();
		this.linkPoints();
	}
	
	#getbaseshape()
	{

		switch(this.distance){
		case 'near':
			let nrow0 = this.#getbaseshaperow(0);
			let nrow1 = this.#getbaseshaperow(1);
			this.points = nrow0.concat(nrow1.reverse());
			break;
		case 'far':
			let frow1 = this.#getbaseshaperow(1);
			let frow2 = this.#getbaseshaperow(2);
			this.points = frow1.concat(frow2.reverse());
			break;
		case 'veryfar':
			let vrow2 = this.#getbaseshaperow(2);
			let vrow4 = this.#getbaseshaperow(4);
			this.points = vrow2.concat(vrow4.reverse());
			break;
		}
	}
	
	#getbaseshaperow(row)
	{
		let points = [];
		const dist = [0, 100, 250, 450, 2500];
		const nlist = {
			'west': [11,0],
			'north-west': [0,1,2],
			'north': [2,3],
			'north-east': [3,4,5],
			'east': [5,6],
			'south-east': [6,7,8],
			'south': [8,9],
			'south-west':[9,10,11],
		};
		if(row==0){
			points.push(new LinkedPoint(this.point.x,this.point.y));
			return points;
		}
		nlist[this.direction].forEach(n => points.push(this.#getbaseshapepoint(n, dist[row])));
		return points;
		
	}
	
	#getbaseshapepoint(n, dist)
	{
		const a = Math.tan((22.5 * Math.PI) / 180);
		let py=this.point.y+dist*this.#getsinglepointcoof(n,a);
		let px=this.point.x+dist*this.#getsinglepointcoof(n+3,a);
		return new LinkedPoint(px, py);
	}
	
	#getsinglepointcoof(n,a)
	{
		let p = n%12;
		let c = 1;
		if([0,5,6,11].includes(p)){
			c = a;
		}
		if( p < 6){
			c *= -1;
		}
		return c;
	}

	getAvgPont(){
		return new Point(this.point.x, this.point.y);
	}
}

// ============================================================================
// pointpicker.js - PointPicker class
// ============================================================================

class PointPicker {
    constructor({isodirection, isodistance, addbutton, svg, pasteInput}) {
        this.coordpicker = new CoordPicker();
        this.isodirection = new IsoButton(isodirection);
        this.isodistance = new IsoButton(isodistance);
        this.addbutton = document.getElementById(addbutton);
        this.coordpicker.init(this.checkAddButtonCondition.bind(this));
        this.isodirection.init(this.checkAddButtonCondition.bind(this));
        this.isodistance.init(this.checkAddButtonCondition.bind(this));
        this.pasteInput = document.getElementById(pasteInput);
        this.pasteInput.addEventListener('input', () => {
            const text = this.pasteInput.value.toLowerCase();
            this.parseTextInput(text);
        });
    }

    parseTextInput(text)
    {
          const directions = [
            'north-east',
            'north-west',
            'south-east',
            'south-west',
            'north',
            'south',
            'east',
            'west'
        ];

        let detectedDirection = null;

        for (const dir of directions) {
            const regex = new RegExp(`\\b${dir}\\b`);
            if (regex.test(text)) {
            detectedDirection = dir;
            break;
            }
        }
        if(!detectedDirection) return;

        let distance = 'near';
        if (/\bvery\s+far\b/.test(text)) {
            distance = 'veryfar';
        } else if (/\bfar\b/.test(text)) {
            distance = 'far';
        }

        this.isodirection.click(detectedDirection);
        this.isodistance.click(distance);
    }

    getValue() {
        let result = this.coordpicker.getValue();
        if(result == null) {
            alert("Invalid coordinates!");
            return null;
        }
        result.direction = this.isodirection.getValue();
        result.distance = this.isodistance.getValue();
        return result;
    }

    resetChoosen() {
        this.coordpicker.resetChoosen();
        this.isodirection.resetChoosen();
        this.isodistance.resetChoosen();
        this.checkAddButtonCondition();
        this.pasteInput.value = "";
    }

    GetRightClickHandler() {
        return this.coordpicker.rightClickHandler.bind(this.coordpicker);
    }

    checkAddButtonCondition()
    {
        if(this.isodistance.isSet() && this.coordpicker.isSet() && this.isodirection.isSet())
        {
            this.addbutton.classList.add('active');
            this.addbutton.disabled=false;
        }
        else if(this.addbutton.disabled == false)
        {
            this.addbutton.disabled = true;
            this.addbutton.classList.remove('active');
        }
    }
}

// ============================================================================
// hunter.js - Main FiendishHunter class and initialization
// ============================================================================

class FiendishHunter {
	#map;
	#pointpicker;
	
	constructor({map, isodirection, isodistance, addbutton, deletebutton, exivaInput}){
		this.#map = new TibiaMap(map);
		this.#map.init();
		this.#pointpicker = new PointPicker(
			{	isodirection:isodirection, 
				isodistance:isodistance, 
				addbutton:addbutton, 
				svg:this.#map.getSvgContainer(),
				pasteInput:exivaInput});
		this.pointsmanager = new Manager(this.#map.getSvgContainer());

		this.#map.registerCallback(this.#pointpicker.GetRightClickHandler());

		document.getElementById(addbutton).addEventListener('click', () => {
			let value = this.#pointpicker.getValue();
			this.#pointpicker.resetChoosen();
			this.#map.hideCross();
			if(value == null) {
				return;
			}
			this.pointsmanager.addPoint(value);
		});

		document.getElementById(deletebutton).addEventListener('click', () => {
			this.pointsmanager.deleteAll();
		});

		// Fullscreen functionality
		const fullscreenButton = document.getElementById('fiend-hunter-button-fullscreen');
		if (fullscreenButton) {
			let isFullscreen = false;
			const elementsToHide = ['header', 'banner', 'right-header', 'left-sidebar', 'right-sidebar', 'tibiatrade_low_res', 'fiend-hunter-how-to-use', 'footer', 'left-footer-space', 'right-footer-space'];
			const navToggle = document.querySelector('.nav-toggle');
			const mainContent = document.getElementById('main-content');
			const pageContainer = document.getElementById('page-container');
			const mapContainer = document.getElementById('tibia-map');
			let originalMainContentStyle = null;
			let originalPageContainerStyle = null;
			let originalNavToggleDisplay = null;
			let originalMapContainerStyle = null;

			fullscreenButton.addEventListener('click', () => {
				if (!isFullscreen) {
					// Store original inline styles (only if they were set inline)
					if (mainContent) {
						originalMainContentStyle = {
							flexBasis: mainContent.style.flexBasis || '',
							marginLeft: mainContent.style.marginLeft || '',
							marginRight: mainContent.style.marginRight || '',
							width: mainContent.style.width || '',
							height: mainContent.style.height || ''
						};
						// Apply fullscreen styles
						mainContent.style.flexBasis = '100%';
						mainContent.style.width = '100%';
						mainContent.style.height = '100vh';
						mainContent.style.marginLeft = '0';
						mainContent.style.marginRight = '0';
					}

					if (pageContainer) {
						originalPageContainerStyle = {
							display: pageContainer.style.display || '',
							height: pageContainer.style.height || ''
						};
						pageContainer.style.display = 'block';
						pageContainer.style.height = '100vh';
					}

					// Store and set map container height to fill viewport minus button area
					if (mapContainer) {
						originalMapContainerStyle = {
							height: mapContainer.style.height || '',
							minHeight: mapContainer.style.minHeight || ''
						};
						mapContainer.style.height = 'calc(100vh - 190px)';
						mapContainer.style.minHeight = 'calc(100vh - 190px)';
					}

					// Hide other elements
					elementsToHide.forEach(id => {
						const element = document.getElementById(id);
						if (element) {
							element.style.display = 'none';
						}
					});

					if (navToggle) {
						// Store original display value (only if it was set inline)
						originalNavToggleDisplay = navToggle.style.display || '';
						navToggle.style.display = 'none';
					}

					isFullscreen = true;
					fullscreenButton.classList.add('active');
				} else {
					// Restore original styles - remove inline styles if they weren't originally set
					if (mainContent && originalMainContentStyle) {
						if (originalMainContentStyle.flexBasis) {
							mainContent.style.flexBasis = originalMainContentStyle.flexBasis;
						} else {
							mainContent.style.removeProperty('flex-basis');
						}
						if (originalMainContentStyle.marginLeft) {
							mainContent.style.marginLeft = originalMainContentStyle.marginLeft;
						} else {
							mainContent.style.removeProperty('margin-left');
						}
						if (originalMainContentStyle.marginRight) {
							mainContent.style.marginRight = originalMainContentStyle.marginRight;
						} else {
							mainContent.style.removeProperty('margin-right');
						}
						if (originalMainContentStyle.width) {
							mainContent.style.width = originalMainContentStyle.width;
						} else {
							mainContent.style.removeProperty('width');
						}
						if (originalMainContentStyle.height) {
							mainContent.style.height = originalMainContentStyle.height;
						} else {
							mainContent.style.removeProperty('height');
						}
					}

					if (pageContainer && originalPageContainerStyle) {
						if (originalPageContainerStyle.display) {
							pageContainer.style.display = originalPageContainerStyle.display;
						} else {
							pageContainer.style.removeProperty('display');
						}
						if (originalPageContainerStyle.height) {
							pageContainer.style.height = originalPageContainerStyle.height;
						} else {
							pageContainer.style.removeProperty('height');
						}
					}

					// Restore map container height - remove inline styles if they weren't originally set
					if (mapContainer && originalMapContainerStyle) {
						if (originalMapContainerStyle.height) {
							mapContainer.style.height = originalMapContainerStyle.height;
						} else {
							mapContainer.style.removeProperty('height');
						}
						if (originalMapContainerStyle.minHeight) {
							mapContainer.style.minHeight = originalMapContainerStyle.minHeight;
						} else {
							mapContainer.style.removeProperty('min-height');
						}
					}

					// Show other elements
					elementsToHide.forEach(id => {
						const element = document.getElementById(id);
						if (element) {
							element.style.display = '';
						}
					});

					if (navToggle) {
						// Restore original display, or remove inline style if it was empty (let CSS handle it)
						navToggle.style.display = originalNavToggleDisplay || '';
						// On desktop, ensure it's hidden (CSS should handle this, but force it if needed)
						if (window.innerWidth > 768) {
							navToggle.style.display = 'none';
						}
					}

					isFullscreen = false;
					fullscreenButton.classList.remove('active');
				}
			});
		}
	}

	get map(){
		return this.#map;
	}

}

class Manager{
	#childs = new Map(); 
	#polygons = new Map();
	#svg;
	constructor(svg){
		this.#svg = svg;
	}

	addPoint(value){
		let newData = new HunterDataContainer(new ExivaPolygon(value.distance, value.direction, fromTibiaCoord(value.point)), this.#svg);
		newData.score = 1;
		this.#childs.set(newData.id, new Set());
		let intersections = [];
		for (const [key,point] of this.#polygons) {
			let intersection = new PolygonIntersector(point.poly, newData.poly).doMagic();
			if(intersection != null){
				let newIntersecion = new HunterDataContainer(intersection, this.#svg);
				newIntersecion.score = this.getScore(point, newData);
				this.#childs.set(newIntersecion.id, new Set());
				this.#childs.get(newIntersecion.id).add(point.id);
				this.#childs.get(newIntersecion.id).add(newData.id);
				intersections.push(newIntersecion);
			}
		}

		this.#polygons.set(newData.id, newData);
		if(intersections.length == 0){

		}
		else{
			intersections.forEach(element => this.#polygons.set(element.id, element));
		}
		this.#updateDisplay();
	}

	#updateDisplay(){
		const maxScore = this.#getMaxScore();
		this.#polygons.forEach((value, key) => 
		{
			value.updateLooksBasedOnMaxScore(maxScore);
		});
	}

	#getMaxScore(){
		let maxScore = 0;
		for (const [key, point] of this.#polygons) {
			if(point.score > maxScore){
				maxScore = point.score;
			}
		}
		return maxScore;
	}

	removePoint(id){
		const childsSet = this.#childs.get(id);

		if (childsSet && childsSet.size != 0) {
			childsSet.forEach(child => {
				this.removePoint(child);
			});
		}
		this.#polygons.get(id).destroy();
		this.#polygons.delete(id);
		this.#updateDisplay();
	}

	deleteAll(){
		HunterDataContainer.clearCounter();
		this.#polygons.forEach((value, key) => 
		{
			value.destroy();
		});
		this.#polygons = new Map();
		this.#childs = new Map();
	}

	getScore(HunterDataContainer1, HunterDataContainer2){
		//if((HunterDataContainer2.poly instanceof ExivaPolygon && HunterDataContainer2.poly.distance == 'Very Far') || 
		//(HunterDataContainer1.poly instanceof ExivaPolygon && HunterDataContainer1.poly.distance == 'Very Far')){
		//	return this.getDistanceScore(HunterDataContainer1.poly, HunterDataContainer2.poly);
		//}
		return Math.max(HunterDataContainer1.score,HunterDataContainer2.score) + 1;
	}

	getDistanceScore(poly1, poly2){
		let p1 = poly1.getAvgPont();
		let p2 = poly2.getAvgPont();
		let dist = Math.max(Math.abs(p1.x - p2.x), Math.abs(p1.y - p2.y)) - 450;
		if(dist < 0){
			return Math.max(poly1.score,poly2.score) + 1;
		}
		const A = 1;       // Starting value
		const B = 0.1;    // Asymptotic value as x → ∞
		const x0 = 300;    // Transition center point
		const k = 0.01;    // Steepness of the transition
	  
		const raw = A - (A - B) / (1 + Math.exp(-k * (dist - x0)));
  		return (Math.round(raw * 10) / 10) + Math.max(poly1.score,poly2.score) ;
	}
}

class HunterDataContainer {
	static counter = 0;
	#id;
	#svgpolygon;
	score = 0;
	poly;
	constructor(polygon, svg){
		this.#id = HunterDataContainer.counter++;
		this.poly = polygon;
		this.#svgpolygon = new SVGPolygon(svg);
		this.#svgpolygon.draw(this.poly.points);
		this.#setBaseLook();
	}
	set id(value){}	
	get id (){
		return this.#id;
	}

	static clearCounter(){
		HunterDataContainer.counter = 0;
	}

	destroy(){
		this.#svgpolygon.destroy();
	}

	#setBaseLook(){
		this.#svgpolygon.setStrokeColor('black');
		this.#svgpolygon.setFillColor("#E0B32D"); // Default color
	}

	updateLooksBasedOnMaxScore(maxScore)
	{
		if(this.score > maxScore - 1){
			this.#setResultLook();
		}
		else{
			this.#setBackgroundLook();
		}
	}

	#setResultLook(){
		this.#svgpolygon.setOpacity(80);
		this.#svgpolygon.setFillOpacity(60);
    }
	
	#setBackgroundLook(){
		this.#svgpolygon.setOpacity(30);
		this.#svgpolygon.setFillOpacity(30);
	}
}

// ============================================================================
// Initialization
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
	const hunter = new FiendishHunter({
		map: 'tibia-map',
		isodirection: 'fiend-hunter-isostat-direction',
		isodistance: 'fiend-hunter-isostat-distance',
		addbutton: 'fiend-hunter-button-add',
		deletebutton: 'fiend-hunter-button-delete',
		exivaInput: 'fiend-hunter-input-spell'
	});
	
	// Add global paste handler for Exiva Log input
	const exivaInput = document.getElementById('fiend-hunter-input-spell');
	if (exivaInput) {
		document.addEventListener('keydown', async (e) => {
			// Check for Ctrl+V (Windows/Linux) or Cmd+V (Mac)
			if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
				// Only handle if not already focused on an input/textarea
				const activeElement = document.activeElement;
				const isInputFocused = activeElement && (
					activeElement.tagName === 'INPUT' || 
					activeElement.tagName === 'TEXTAREA' ||
					activeElement.isContentEditable
				);
				
				// If no input is focused, or if the Exiva input is focused, handle paste
				if (!isInputFocused || activeElement === exivaInput) {
					e.preventDefault();
					try {
						const text = await navigator.clipboard.readText();
						if (text) {
							exivaInput.value = text;
							exivaInput.focus();
							// Trigger input event to parse the text
							exivaInput.dispatchEvent(new Event('input', { bubbles: true }));
						}
					} catch (err) {
						// Fallback: if clipboard API fails, let default paste behavior happen
						// but focus the input first
						if (!isInputFocused) {
							exivaInput.focus();
						}
					}
				}
			}
		});
	}
});
