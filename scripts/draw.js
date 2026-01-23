import { Point } from "./common.js"; 
export class SVGCross{
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

export class SVGLine{
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

export class SVGPolygon{
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