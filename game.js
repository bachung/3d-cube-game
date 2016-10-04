var screenWidth = 1600;
var screenHeight = 900;
var c = document.getElementById("canvas");
var pointArr = [];
var triArr = [];
var cameraX = 0;
var cameraY = 100;
var cameraZ = 0;
var cameraDirection = 0;
var cameraDirectionY = 0;
var degToRad = 0.0174533;
var horizontalFOV = 60;
var verticalFOV = 36;//2 * Math.atan( Math.tan(screenWidth / 2) * screenWidth/screenHeight );
horizontalFOV *= degToRad;
verticalFOV *= degToRad;
var cameraVelocity = [0,0,0,0,0,0];
var cameraJump = false;
var moveSpeed = 240;
var jumpAmount = 200;
var gameObjects = [];
var staticObjects = [];
var a = true;
var mouseTurn = 0;
var mouseTurnY = 0;
c.requestPointerLock();
c.onclick = function (e){
    document.body.requestPointerLock();
};
function validPoint(point1, point2) {
    return !(point1.screenZ < 0 || point2.screenZ < 0);
    return !(point1.screenZ < 0 || point2.screenZ < 0 ||
           ((point1.screenX < 0 || point1.screenX > screenWidth) &&
          (point2.screenX < 0 && point2.screenX > screenWidth)) ||
          ((point1.screenY < 0 || point1.screenY > screenHeight) &&
          (point2.screenY < 0 || point2.screenY > screenHeight)));

}
function canvas(c) {
    this.canvas = c;
    
    this.context = this.canvas.getContext("2d");
    this.context.fillStyle="red";
    this.drawPoint = function (p) {
        //alert(p.screenX);
        if(p.screenZ < 0) {
            return;   
        }
        this.context.fillRect(p.screenX, p.screenY, 1, 1);
    };
    this.drawTriangle = function (t) {
        this.drawLine(t.point1, t.point2);
        this.drawLine(t.point2, t.point3);
        this.drawLine(t.point3, t.point1);
    };
    this.fillObject = function (o) {
        this.context.fillStyle=o.color;
        o.fill(this);
    };
    this.fillRect = function (p1, p2, p3, p4) {
        this.context.beginPath();
        if((!validPoint(p1, p2) && !validPoint(p2, p3) && !validPoint(p3, p4) && !validPoint(p4, p1))){
            return;
        }
        this.context.moveTo(p1.screenX, p1.screenY);
        this.context.lineTo(p2.screenX, p2.screenY);
        this.context.lineTo(p3.screenX, p3.screenY);
        this.context.lineTo(p4.screenX, p4.screenY);
        this.context.closePath();
        
        this.context.fill();
    };
    
    this.drawLine = function (point1, point2) {
        if(!validPoint(point1, point2)){
            return;   
        }
        this.context.beginPath();
        this.context.moveTo(point1.screenX, point1.screenY);
        this.context.lineTo(point2.screenX, point2.screenY);
        this.context.stroke();
        this.context.closePath();
    };
    this.drawObject = function (obj) {
        for(k=0;k<obj.pointsArr.length;k++){
            //obj.pointsArr[k].convertToScreen();
            this.drawPoint(obj.pointsArr[k]);   
        }
        this.fillObject(obj);
        this.context.fillStyle="black";
        for(k=0;k<obj.triangleArr.length;k++){
            this.drawTriangle(obj.triangleArr[k]);   
        }
    };
}
function rotateTransform(x, y, z) {
    // columns : 
    // 1 0 0
    // 0, cos(t), -sin(t)
    // 0, sin(t), cos(t)
    var arr = rotateTransformOld(x, y, z);
    x = arr[0];
    y = arr[1];
    z = arr[2];
    var newX, newY, newZ;
    newX = x;
    newY = y * Math.cos(cameraDirectionY) + z * Math.sin(cameraDirectionY);
    newZ = y * -Math.sin(cameraDirectionY) + z * Math.cos(cameraDirectionY);
    return [newX, newY, newZ];
}
function rotateTransformOld(x, y, z) {
    // columns : 
    // cos(t), 0, -sin(t)
    // 0, 1, 0
    // sin(t), 0, cos(t)
    var newX, newY, newZ;
    newX = x * Math.cos(-cameraDirection) + z * -Math.sin(-cameraDirection);
    newY = y;
    newZ = x * Math.sin(-cameraDirection) + z * Math.cos(-cameraDirection);
    return [newX, newY, newZ];
}
function scaleX(x, z) {
    var theta = horizontalFOV / 2;
    var w = Math.abs(z) * Math.tan(theta);
    return ((x + w) / (2 * w)) * screenWidth;
}
function scaleY(y, z) {
    var theta = verticalFOV / 2;
    var h = Math.abs(z) * Math.tan(theta);
    return ((y + h) / (2 * h)) * screenHeight;
}
function Point(x, y, z) {
    this.worldX = x;
    this.worldY = y;
    this.worldZ = z;
    this.convertToScreen = function (static) {
        var sX, sY, sZ;
        if(!static){
            sX = this.worldX - cameraX;
            sY = this.worldY - cameraY;
            sZ = this.worldZ - cameraZ;
        } else {
            sX = this.worldX;
            sY = this.worldY;
            sZ = this.worldZ;
            var newPos = rotateVelocityVector(sX, sZ, cameraDirection);
            sX = newPos[0];
            sZ = newPos[1];
            newPos = rotateVelocityVectorY(sY, sZ, cameraDirectionY);
            sY = newPos[0];
            sZ = newPos[1];
        }
        var rotated = rotateTransform(sX, sY, sZ);
        sX = rotated[0];
        sY = rotated[1];
        sZ = rotated[2];
        sX = scaleX(sX, sZ);
        sY = scaleY(sY, sZ);

        this.screenX = sX;
        this.screenY = screenHeight - sY;
        this.screenZ = sZ;
    };
}
function Triangle(a, b, c) {
    this.point1 = a;
    this.point2 = b;
    this.point3 = c;
}

function Object() {
    this.pointsArr = [];
    this.triangleArr = [];
    this.getScreenCords = function () {
        var minZ = 99999999;
        for(l=0;l<this.pointsArr.length;l++) {
            this.pointsArr[l].convertToScreen();
            if(this.pointsArr[l].screenZ < minZ && this.pointsArr[l].screenZ > 0){
                minZ = this.pointsArr[l].screenZ;
            }
        };
        this.minZ = minZ;
    };
}

function Rectangle(p, w, l, h, color) {
    this.pointsArr = [];
    this.triangleArr = [];
    this.color = color;
    this.static = false;
    this.getScreenCords = function () {
        var minZ = 99999999;
        for(l=0;l<this.pointsArr.length;l++) {
            this.pointsArr[l].convertToScreen(this.static);
            if(this.pointsArr[l].screenZ < minZ && this.pointsArr[l].screenZ > 0){
                minZ = this.pointsArr[l].screenZ;
            }
        };
        this.minZ = minZ;
    };
    var arr = [];
    this.pointsArr.push(new Point(p.worldX, p.worldY, p.worldZ));
    this.pointsArr.push(new Point(p.worldX, p.worldY + h, p.worldZ));
    this.pointsArr.push(new Point(p.worldX + w, p.worldY + h, p.worldZ));
    this.pointsArr.push(new Point(p.worldX + w, p.worldY, p.worldZ));
    this.pointsArr.push(new Point(p.worldX, p.worldY, p.worldZ + l));
    this.pointsArr.push(new Point(p.worldX, p.worldY + h, p.worldZ + l));
    this.pointsArr.push(new Point(p.worldX + w, p.worldY + h, p.worldZ + l));
    this.pointsArr.push(new Point(p.worldX + w, p.worldY, p.worldZ + l));
    this.triangleArr.push(new Triangle(this.pointsArr[0], this.pointsArr[1], this.pointsArr[2]));
    this.triangleArr.push(new Triangle(this.pointsArr[0], this.pointsArr[1], this.pointsArr[3]));
    
    this.triangleArr.push(new Triangle(this.pointsArr[4], this.pointsArr[5], this.pointsArr[1]));
    this.triangleArr.push(new Triangle(this.pointsArr[0], this.pointsArr[5], this.pointsArr[4]));
    
    this.triangleArr.push(new Triangle(this.pointsArr[7], this.pointsArr[6], this.pointsArr[4]));
    this.triangleArr.push(new Triangle(this.pointsArr[5], this.pointsArr[6], this.pointsArr[7]));
    
    this.triangleArr.push(new Triangle(this.pointsArr[3], this.pointsArr[2], this.pointsArr[6]));
    this.triangleArr.push(new Triangle(this.pointsArr[2], this.pointsArr[7], this.pointsArr[3]));
    
    this.triangleArr.push(new Triangle(this.pointsArr[1], this.pointsArr[5], this.pointsArr[6]));
    this.triangleArr.push(new Triangle(this.pointsArr[6], this.pointsArr[2], this.pointsArr[5]));
    
    this.triangleArr.push(new Triangle(this.pointsArr[4], this.pointsArr[0], this.pointsArr[3]));
    this.triangleArr.push(new Triangle(this.pointsArr[3], this.pointsArr[7], this.pointsArr[0]));
    
    this.fill = function (cv) {
        cv.fillRect(this.pointsArr[0], this.pointsArr[1], this.pointsArr[2], this.pointsArr[3]);
        cv.fillRect(this.pointsArr[4], this.pointsArr[5], this.pointsArr[6], this.pointsArr[7]);
        cv.fillRect(this.pointsArr[0], this.pointsArr[4], this.pointsArr[5], this.pointsArr[1]);
        cv.fillRect(this.pointsArr[3], this.pointsArr[7], this.pointsArr[6], this.pointsArr[2]);
        cv.fillRect(this.pointsArr[1], this.pointsArr[5], this.pointsArr[6], this.pointsArr[2]);
        cv.fillRect(this.pointsArr[0], this.pointsArr[4], this.pointsArr[7], this.pointsArr[3]);

    };
}
function Bullet(){
    var addVector = rotateVelocityVector(0, 20, cameraDirection);
    var Vector2 = rotateVelocityVectorY(0, addVector[1], cameraDirectionY);
    Rectangle.call(this, new Point(cameraX+(addVector[0]-0.1), cameraY + Vector2[0]-0.1, cameraZ + Vector2[1]), 0.2, 0.2, 0.2, "red");
    this.velocity = [addVector[0]*10, -Vector2[1]*10, Vector2[0]*10];
}
var canvas = new canvas(c);

var lastTime = window.performance.now();
var t = window.performance.now();

var cube = new Rectangle(new Point(-50, 50, 100), 200, 100, 200, "red");
var cube2 = new Rectangle(new Point(-150, 50, 200), 100, 100, 200, "blue");
var cube3 = new Rectangle(new Point(150, 50, 200), 100, 100, 200, "green");
var thing = new Rectangle(new Point(20, -40, 20), 10, 200, 20, "white");
thing.static = true;
//var floor = new Rectangle(new Point(-1000, -50, 1000), 2000, 2000, 5, "purple");
gameObjects.push(cube);
gameObjects.push(cube2);
gameObjects.push(cube3);
//gameObjects.push(thing);
//gameObjects.push(floor);
function rotateVelocityVector(x, z, rad) {
    var newX, newZ;
    newX = x * Math.cos(rad) + z * -Math.sin(rad);
    newZ = x * Math.sin(rad) + z * Math.cos(rad);
    return [newX, newZ];
}
function rotateVelocityVectorY(y, z, rad) {
    var newY, newZ;
    newY = y * Math.cos(rad) + z * -Math.sin(rad);
    newZ = y * Math.sin(rad) + z * Math.cos(rad);
    return [newY, newZ];
}
var yVelocity = 0;
function gameLoop() {
    t = window.performance.now() - lastTime;
    canvas.context.clearRect(0,0,screenWidth, screenHeight);
    
    
    cameraDirection += mouseTurn;
    cameraDirectionY += mouseTurnY;
    mouseTurn=0;
    mouseTurnY=0;
    //cameraDirection += t/1000 * cameraVelocity[4];
    //cameraDirection -= t/1000 * cameraVelocity[5];
    var moveAmount = t/1000 * moveSpeed;
    var zVelocity = moveAmount*(cameraVelocity[0]-cameraVelocity[1]);
    
    var yAccel = -2*jumpAmount;
    var xVelocity = moveAmount*(cameraVelocity[3]-cameraVelocity[2]);
    var newVector = rotateVelocityVector(xVelocity, zVelocity, cameraDirection);
    cameraZ += newVector[1];
    cameraX += newVector[0];
    for(i=0;i<gameObjects.length;i++){
        gameObjects[i].getScreenCords(); 
    }
    gameObjects.sort(function(a, b) {
        return b.minZ - a.minZ;
    });
    for(i=0;i<gameObjects.length;i++){
        canvas.drawObject(gameObjects[i]);   
    }
    for(i=0;i<gameObjects.length;i++){
    if(gameObjects[i].velocity != undefined) {
        if(gameObjects[i].pointsArr[0].screenZ >= 2000){
            gameObjects.splice(i, 1);
            i--;
            continue;
        }
        for(k=0; k < gameObjects[i].pointsArr.length; k++){
            gameObjects[i].pointsArr[k].worldX += (t/1000) * gameObjects[i].velocity[0];
            gameObjects[i].pointsArr[k].worldY += (t/1000) * gameObjects[i].velocity[1];
            gameObjects[i].pointsArr[k].worldZ += (t/1000) * gameObjects[i].velocity[2];
        }
    }
    }
    if(cameraJump && cameraY == 100) {
        yVelocity = jumpAmount;
    }
    yVelocity += (t/1000) * yAccel;
    
    cameraY += (t/1000) * yVelocity;
    if(cameraY < 100) {
        cameraY = 100;
        yVelocity = 0;
    }
    canvas.context.fillText((1000/t) + " fps", 0, 10);
    lastTime = window.performance.now();
}
document.addEventListener("keydown", function (e) {
    if ( e.keyCode == 87 ) { //UP
        cameraVelocity[0] = 1;
    }

    if ( e.keyCode == 83 ) { //DOWN
        cameraVelocity[1] = 1;
    }

    if ( e.keyCode == 65 ) { //LEFT
        cameraVelocity[2] = 1;
    }

    if ( e.keyCode == 68 ) { //RIGHT
        cameraVelocity[3] = 1;
    }
    if ( e.keyCode == 70 ) { //RESET
        cameraX = 0;
        cameraY = 100;
        cameraZ = 0;
        cameraDirection = 0;
        cameraDirectionY = 0;
    }
    if ( e.keyCode == 32 ) { //JUMP
        cameraJump = true;
    }

}, true);
document.addEventListener("keyup", function (e) {
    if ( e.keyCode == 87 ) { //UP
        cameraVelocity[0] = 0;
    }

    if ( e.keyCode == 83 ) { //DOWN
        cameraVelocity[1] = 0;
    }

    if ( e.keyCode == 65 ) { //LEFT
        cameraVelocity[2] = 0;
    }

    if ( e.keyCode == 68 ) { //RIGHT
        cameraVelocity[3] = 0;
    }

    if ( e.keyCode == 32 ) { //JUMP
        cameraJump = false;
    }

}, true);
document.onclick = function (e) {
    
};
document.onmousemove = function (e) {
    mouseTurn -= e.movementX/1000;
    mouseTurnY += e.movementY/1000;
}

setInterval(gameLoop, 0);