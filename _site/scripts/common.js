export class Point {
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

export class LinkedPoint extends Point{

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