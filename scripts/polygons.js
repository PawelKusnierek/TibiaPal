import { LinkedPoint, Point } from "./common.js"; 

export class PolygonIntersector {
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


export class Polygon {

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

export class Edge {
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

export class IntersectionPolygon extends Polygon {
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

export class ExivaPolygon extends Polygon{
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
