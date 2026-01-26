import { Point } from './common.js';
import { SVGCross } from "./draw.js";

export class Map {

constructor(containerid) {
    this.container=document.getElementById(containerid);
}  

static zoomLvls = [0.25,0.5,1,2,4,8,16];
static crossWidth = [4,4,2,1,1,1,1];

zoomIdx = Map.zoomLvls.indexOf(1); 
minZoom = Map.zoomLvls[0];
gridSizeX = 0;
gridSizeY = 0;
point = null;
#cross; 

imageStore = [];scale = 1; isDragging = false;originX = 0; originY =0; startX = 0; startY = 0;container;mapWrapper;floorloaded = -1; moveCallabck = null; #clickCallback = null; #hasMoved = false;

init()
{	
	this.container.classList.add("tibia-map");

	//create buttons
	const buttons = document.createElement("div");
	buttons.id = this.container.id + "-buttons";
	buttons.classList.add("tibia-map-button-container");
	this.container.appendChild(buttons);
	
	for (let i = 0; i < 15; i++) {
		const button = document.createElement("button");
		button.id = "buttonfloor"+ (-i + 7);
		button.textContent = -i + 7;
		button.disabled = true;
		button.classList.add("tibia-map-button");
		button.addEventListener('click', () => {
			this.loadFloor(i);
		}); 
		buttons.appendChild(button);
	}

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
				this.#cross.setWidth(Map.crossWidth[this.zoomIdx]);
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
				//when all images loaded, enable buttons
				this.container.querySelectorAll('button').forEach(button => {
					button.disabled = false;
				});
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
	this.container.querySelectorAll('button').forEach(button => {
				button.classList.remove('tibia-map-button-highlight');
			});
	document.getElementById('buttonfloor'+ this.getFloorLoaded()).classList.add('tibia-map-button-highlight');
}

#loadNextFloor(floor){
	let desiredfloor = Math.max(0, Math.min(14, floor));
	if (desiredfloor != this.floorloaded) {
		loadFloor(desiredfloor);
	}
}

loadNextFloorUp(){
	let floor = this.floorloaded - 1;
	loadNextFloor(floor);
}

loadNextFloorDown(){
	let floor = this.floorloaded + 1;
	loadNextFloor(floor);
}

getFloorLoaded() {
	return -this.floorloaded+7;
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
	this.zoomIdx = Math.max(0, Math.min(this.zoomIdx, Map.zoomLvls.length-1));
	let newScale = Math.max(this.minZoom, Map.zoomLvls[this.zoomIdx]); 
	this.#cross.setWidth(Map.crossWidth[this.zoomIdx]);
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