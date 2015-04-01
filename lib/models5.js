/*
 * Model for the viewer
 */
function Viewer() {
    this.x = 0;
    this.y = 0;
    this.z = 0;
    this.bounds = {x:48, y:48, z:48};
    this.horizontalRotation = 0;
    this.verticalRotation = 0;
}
;

Viewer.prototype.setupView = function (context, pMatrix, mvMatrix) {
    mat4.perspective(45, context.canvasWidth / context.canvasHeight, 1, 510.0, pMatrix);
    mat4.identity(mvMatrix);
    mat4.rotate(mvMatrix, this.verticalRotation, [1, 0, 0]);
    mat4.rotate(mvMatrix, this.horizontalRotation, [0, 1, 0]);
    mat4.translate(mvMatrix, [-this.x, -this.y, -this.z]);
};

Viewer.prototype.moveForward = function (forward, onXZPlane, sceneRoot) {

    var lookVector = [0, 0, -1];
    var viewVector = [0, 0, -1];

    tmpMatrix = mat4.create();
    mat4.identity(tmpMatrix);
    mat4.rotate(tmpMatrix, this.horizontalRotation, [0, 1, 0]);
    if (!onXZPlane) mat4.rotate(tmpMatrix, this.verticalRotation, [1, 0, 0]);

    mat4.multiplyVec3(tmpMatrix, lookVector, viewVector);

    if (sceneRoot) {
        var canMove = canMoveForward();
        if ((forward && canMove == 'noForward') || (!forward && canMove == 'noBackward')) return;
    }
    if (forward) {
        if(this.checkBounds(viewVector, true)) {
            this.x -= viewVector[0];
            this.y -= viewVector[1];
            this.z += viewVector[2];
        }
    }
    else if (this.checkBounds(viewVector, false)) {
        this.x += viewVector[0];
        this.y += viewVector[1];
        this.z -= viewVector[2];
    }
    //DIY height adjustment, lookup in array is too slow;
    if (this.x < -25 && this.z < -25) {
        if (this.x < -36 && this.z < -36) this.y = 4;
        else this.y = 3;
    }
    else this.y = 2;
};

Viewer.prototype.checkBounds = function (viewVector, forward) {
    if (!forward) {
        viewVector[0] = -1 * viewVector[0];
        viewVector[1] = -1 * viewVector[1];
        viewVector[2] = -1 * viewVector[2];
    }
    var wouldBeOutOfBounds = (Math.abs(this.x - viewVector[0]) < this.bounds.x) &&
        (Math.abs(this.y - viewVector[1]) < this.bounds.y) &&
        (Math.abs(this.z - viewVector[2]) < this.bounds.z);
    var movingBackToCenter = (!(Math.abs(this.x) - this.bounds.x > 0) || (this.x > 0 ? (viewVector[0] >= 0) : (viewVector[0] <= 0))) &&
        (!(Math.abs(this.y) - this.bounds.y > 0) || (this.y > 0 ? (viewVector[1] >= 0) : (viewVector[1] <= 0) )) &&
        (!(Math.abs(this.z) - this.bounds.z > 0) || (this.z > 0 ? (viewVector[2] <= 0) : (viewVector[2] >= 0) ));
    //console.log('x check: ' + this.x + ' : ' + viewVector[0] + ' : ' + (this.x > 0 ? (viewVector[0] < 0) : (viewVector[0] > 0) ));
    //console.log('y check: ' + this.y + ' : ' + viewVector[1] + ' : ' + (this.y > 0 ? (viewVector[1] < 0) : (viewVector[1] > 0) ));
    //console.log('z check: ' + this.z + ' : ' + viewVector[2] + ' : ' + (this.z > 0 ? (viewVector[2] < 0) : (viewVector[2] > 0) ));
    //console.log(wouldBeOutOfBounds + ' : ' + movingBackToCenter);
    if (!forward) {//Undo changes to view vector
        viewVector[0] = -1 * viewVector[0];
        viewVector[1] = -1 * viewVector[1];
        viewVector[2] = -1 * viewVector[2];
    }
    return wouldBeOutOfBounds || movingBackToCenter;
}

Viewer.prototype.rotateView = function(mouse, movedMouse, touch) {
    // Reduce movement on touch screens
    var movementScaleFactor = touch ? 4 : 1;

    if (!mouse.last) {
        mouse.last = mouse.start;
    } else {
        if (forward(mouse.start.x, mouse.last.x) != forward(mouse.last.x, movedMouse.x)) {
            mouse.start.x = mouse.last.x;
        }
        if (forward(mouse.start.y, mouse.last.y) != forward(mouse.last.y, movedMouse.y)) {
            mouse.start.y = mouse.last.y;
        }
    }

    this.horizontalRotation -= parseInt((mouse.start.x - movedMouse.x) / movementScaleFactor)/200;
    this.verticalRotation -= parseInt((mouse.start.y - movedMouse.y) / movementScaleFactor)/200;

    mouse.last.x = movedMouse.x;
    mouse.last.y = movedMouse.y;

    //Utility inner function
    function forward(v1, v2) {
        return v1 >= v2 ? true : false;
    }
}

/*
 * Model for the environment, includes lighting
 */
function Environment() {

    this.bgColour = [0, 0, 0];
    this.alpha = 1;
    this.lighting = {
        ambient:[0.5, 0.5, 0.5],
        pointLightPosition:[-10, 4, -20],
        pointLightSpecular:[0.0, 0.0, 0.0],
        pointLightDiffuse:[0.0, 0.0, 0.0],
        specularHighlights:false,
        lighting:true
    };

    this.textures = true;
};

Environment.prototype.setupSceneForDraw = function (context) {
    if (context.state == '3D') {
        this.setupSceneForDraw3D(context);
    }
    else {
        this.setupSceneForDraw2D(context);
    }
};

Environment.prototype.setupSceneForDraw3D = function (context) {

    context.clearColor(this.bgColour[0], this.bgColour[1], this.bgColour[2], this.alpha);

    context.clear(context.COLOR_BUFFER_BIT | context.DEPTH_BUFFER_BIT);

    context.uniform1i(shaderProgram.showSpecularHighlightsUniform, this.lighting.specularHighlights);

    context.uniform1i(shaderProgram.useLightingUniform, this.lighting.lighting);

    if (this.lighting.lighting) {
        context.uniform3f(
            shaderProgram.ambientColorUniform,
            this.lighting.ambient[0],
            this.lighting.ambient[1],
            this.lighting.ambient[2]
        );

        /*context.uniform3f(
         shaderProgram.pointLightingLocationUniform,
         this.lighting.pointLightPosition[0],
         this.lighting.pointLightPosition[1],
         this.lighting.pointLightPosition[2]
         );

         context.uniform3f(
         shaderProgram.pointLightingSpecularColorUniform,
         this.lighting.pointLightSpecular[0],
         this.lighting.pointLightSpecular[1],
         this.lighting.pointLightSpecular[2]
         );

         context.uniform3f(
         shaderProgram.pointLightingDiffuseColorUniform,
         this.lighting.pointLightDiffuse[0],
         this.lighting.pointLightDiffuse[1],
         this.lighting.pointLightDiffuse[2]
         );*/
    }

    context.uniform1i(shaderProgram.useTexturesUniform, this.textures);
};

Environment.prototype.setupSceneForDraw2D = function (context) {

    context.fillStyle = "rgba( " + this.bgColour[0] + "," + this.bgColour[1] + "," + this.bgColour[2] + "," + this.alpha + " )";
    if (this.alpha != 1) {
        //context.clearRect(0, 0, context.canvasWidth, context.canvasHeight);
    }
    if (this.alpha != 0) {
        //context.fillRect(0, 0, context.canvasWidth, context.canvasHeight);
    }
    context.scale(context.canvasWidth / 100, -context.canvasHeight / 100);
    context.translate(50, -50);
};

/*
 ** General Node model, both 2D and 3D
 */
function Node() {
    this.x = 0;
    this.y = 0;
    this.z = 0;
    this.horizontalRotation = 0;
    this.verticalRotation = 0;
    this.animateActive = true;

    this.children = [];
}
;

Node.prototype.draw = function (context, mvMatrix, pMatrix) {
    var copy = mat4.create();
    mat4.set(mvMatrix, copy);

    var position = [this.x, this.y, this.z];
    mat4.translate(mvMatrix, position);
    mat4.rotateY(mvMatrix, this.horizontalRotation);
    mat4.rotateX(mvMatrix, this.verticalRotation);

    for (i in this.children) {
        if (this.children[i].draw) {
            this.children[i].draw(context, mvMatrix, pMatrix);
        }
    }

    mat4.set(copy, mvMatrix);
};

Node.prototype.animate = function (time) {
    for (i in this.children) {
        //if (this.children[i].animate) {
        this.children[i].animate(time);
        //}
    }
};

Node.prototype.populatePickingPipeline = function (mvMatrix, pMatrix, pickingPipeline) {
    var copy = mat4.create();
    mat4.set(mvMatrix, copy);

    var position = [this.x, this.y, this.z];
    mat4.translate(mvMatrix, position);

    for (i in this.children) {
        if (this.children[i].populatePickingPipeline) {
            this.children[i].populatePickingPipeline(mvMatrix, pMatrix, pickingPipeline);
        }
    }

    mat4.set(copy, mvMatrix);
};

Entity.prototype = new Node;
Entity.prototype.constructor = Entity;
function Entity() {
    this.size = 1;
    this.label = "";
    this.shininess = 32;
    this.state = "3D";
    this.horizontalRotation = 0;
    this.verticalRotation = 0;
    this.opacity = 1;

    this.drawer = null;
    this.drawingInformation = null;
}

Entity.prototype.setupForContext = function (context) {
    if (context.state == "3D") {
        this.drawer = new Drawer3D();
        this.drawingInformation = new DrawingInformation3D();
    }
    else {
        this.drawer = new Drawer2D();
        this.drawingInformation = new DrawingInformation2D();
    }
    this.state = context.state;
};

Entity.prototype.initialize = function (context, modelFile, imageFile) {
    //console.log( "In initialize root method" );
    if (this.state == "3D") {
        this.drawingInformation.initialize(context, modelFile, imageFile, this.size);
    }
    else {
        this.drawingInformation.initialize(imageFile);
    }
};

Entity.prototype.draw = function (context, mvMatrix, pMatrix) {
    if (this.drawer && this.drawer.draw) {
        if (!this.drawingInformation) {
            //console.log( "this.drawingInformation null" );
            return;
        }
        this.drawer.draw(this, context, mvMatrix, pMatrix);
    }
};

Entity.prototype.populatePickingPipeline = function (mvMatrix, pMatrix, pickingPipeline) {
    var position = [this.x, this.y, this.z, 1];
    var size = this.size;

    var copy = mat4.create();
    mat4.set(mvMatrix, copy);

    if (!mat4) {
    }//console.log( "mat4 undefined" );}
    if (!mvMatrix) {
    }//console.log( "mvMatrix undefined" );}

    mat4.multiplyVec4(mvMatrix, position);
    var range = Math.sqrt(position[0] * position[0] + position[1] * position[1] + position[2] * position[2]);
    mat4.multiplyVec4(pMatrix, position);
    //if (position[2] > 0) {//This was in because of a picking issue, removed for backwards collision detection
    pickingPipeline.push({
        x:position[0] / position[3],
        y:position[1] / position[3],
        z:position[2],
        range:range,
        size:size / position[3],
        entity:this});//Passing NDC to picker
    /*}
     else {}*/
    mat4.set(copy, mvMatrix);
};

function Drawer3D() {
}

Drawer3D.prototype.draw = function (entity, context, mvMatrix, pMatrix) {

    if(!entity) return;

    var di = entity.drawingInformation;
    var position = [entity.x, entity.y, entity.z, 1];

    if (!di || !di.vertexPositionBuffer || !di.vertexNormalBuffer || !di.vertexTextureCoordBuffer || !di.vertexIndexBuffer) {
        console.log("vertexPositionBuffer null, returning");
        return;
    }

    var copy = mat4.create();
    mat4.set(mvMatrix, copy);

    mat4.rotateY(mvMatrix, entity.horizontalRotation);
    mat4.rotateX(mvMatrix, entity.verticalRotation);
    mat4.translate(mvMatrix, position);

    context.bindBuffer(context.ARRAY_BUFFER, di.vertexPositionBuffer);
    context.vertexAttribPointer(shaderProgram.vertexPositionAttribute, di.vertexPositionBuffer.itemSize, context.FLOAT, false, 0, 0);

    context.bindBuffer(context.ARRAY_BUFFER, di.vertexTextureCoordBuffer);
    context.vertexAttribPointer(shaderProgram.textureCoordAttribute, di.vertexTextureCoordBuffer.itemSize, context.FLOAT, false, 0, 0);

    context.bindBuffer(context.ARRAY_BUFFER, di.vertexNormalBuffer);
    context.vertexAttribPointer(shaderProgram.vertexNormalAttribute, di.vertexNormalBuffer.itemSize, context.FLOAT, false, 0, 0);

    context.activeTexture(context.TEXTURE0);
    context.bindTexture(context.TEXTURE_2D, di.texture);
    context.uniform1i(shaderProgram.samplerUniform, 0);

    if (entity.opacity < 1) {
        mat4.multiplyVec4(mvMatrix, position);
        mat4.multiplyVec4(pMatrix, position);
        var range = Math.sqrt(position[0] * position[0] + position[1] * position[1] + position[2] * position[2]);
        context.blendFunc(context.SRC_ALPHA, context.ONE);
        context.enable(context.BLEND);
        context.disable(context.DEPTH_TEST);
        context.uniform1f(shaderProgram.alphaUniform, parseFloat(entity.opacity * Math.max(0, (1 - range / 510))));
    } else {
        context.disable(context.BLEND);
        //context.enable(context.DEPTH_TEST);
    }

    context.bindBuffer(context.ELEMENT_ARRAY_BUFFER, di.vertexIndexBuffer);
    setMatrixUniforms();
    context.drawElements(context.TRIANGLES, di.vertexIndexBuffer.numItems, context.UNSIGNED_SHORT, 0);

    mat4.set(copy, mvMatrix);

    return;
};

function Drawer2D() {
}

Drawer2D.prototype.draw = function (entity, context, mvMatrix, pMatrix) {
    var di = entity.drawingInformation;
    var position = [entity.x, entity.y, entity.z, 1];

    var copy = mat4.create();
    mat4.set(mvMatrix, copy);

    if (!mat4) {
    }//console.log( "mat4 undefined" );}
    if (!mvMatrix) {
    }//console.log( "mvMatrix undefined" );}

    mat4.multiplyVec4(mvMatrix, position);
    var range = Math.sqrt(position[0] * position[0] + position[1] * position[1] + position[2] * position[2]);
    mat4.multiplyVec4(pMatrix, position);
    if (position[2] > 0) {
        renderPipeline2D.push([position[0] / position[3], position[1] / position[3], range, di.image, entity.size, entity.opacity]);//Passing NDC to drawer
    }
    mat4.set(copy, mvMatrix);
};

function DrawingInformation3D() {
    this.vertexPositionBuffer;
    this.vertexNormalBuffer;
    this.vertexTextureCoordBuffer;
    this.vertexIndexBuffer;
    this.texture;
}

DrawingInformation3D.prototype.initialize = function (context, modelFile, textureImage, size) {
    var request = new XMLHttpRequest();
    request.open("GET", modelFile);
    var that = this;
    request.onreadystatechange = function () {
        if (request.readyState == 4) {

            var modelData = JSON.parse(request.responseText);
            that.resizeModel(modelData, size);

            that.vertexNormalBuffer = context.createBuffer();
            context.bindBuffer(context.ARRAY_BUFFER, that.vertexNormalBuffer);
            context.bufferData(context.ARRAY_BUFFER, new Float32Array(modelData.vertexNormals), context.STATIC_DRAW);
            that.vertexNormalBuffer.itemSize = 3;
            that.vertexNormalBuffer.numItems = modelData.vertexNormals.length / 3;

            that.vertexTextureCoordBuffer = context.createBuffer();
            context.bindBuffer(context.ARRAY_BUFFER, that.vertexTextureCoordBuffer);
            context.bufferData(context.ARRAY_BUFFER, new Float32Array(modelData.vertexTextureCoords), context.STATIC_DRAW);
            that.vertexTextureCoordBuffer.itemSize = 2;
            that.vertexTextureCoordBuffer.numItems = modelData.vertexTextureCoords.length / 2;

            that.vertexPositionBuffer = context.createBuffer();
            context.bindBuffer(context.ARRAY_BUFFER, that.vertexPositionBuffer);
            context.bufferData(context.ARRAY_BUFFER, new Float32Array(modelData.vertexPositions), context.STATIC_DRAW);
            that.vertexPositionBuffer.itemSize = 3;
            that.vertexPositionBuffer.numItems = modelData.vertexPositions.length / 3;

            that.vertexIndexBuffer = context.createBuffer();
            context.bindBuffer(context.ELEMENT_ARRAY_BUFFER, that.vertexIndexBuffer);
            context.bufferData(context.ELEMENT_ARRAY_BUFFER, new Uint16Array(modelData.indices), context.STATIC_DRAW);
            that.vertexIndexBuffer.itemSize = 1;
            that.vertexIndexBuffer.numItems = modelData.indices.length;

            //console.log( "vertexPositionBuffer.numItems: " + that.vertexPositionBuffer.numItems );
            //console.log( "Model loaded" );
        }
        ;
    };
    request.send();

    this.initTexture(textureImage, context);

};

DrawingInformation3D.prototype.initTexture = function (textureImage, context) {
    this.texture = context.createTexture();

    if (!parseInt(textureImage) && !textureImage == 0) {
        //console.log('Setting texture from file');
        //textureImage is a file
        this.texture.image = new Image();
        var that = this;
        this.texture.image.onload = function () {
            context.pixelStorei(context.UNPACK_FLIP_Y_WEBGL, true);
            context.bindTexture(context.TEXTURE_2D, that.texture);
            context.texImage2D(context.TEXTURE_2D, 0, context.RGBA, context.RGBA, context.UNSIGNED_BYTE, that.texture.image);
            context.texParameteri(context.TEXTURE_2D, context.TEXTURE_MAG_FILTER, context.NEAREST);
            context.texParameteri(context.TEXTURE_2D, context.TEXTURE_MIN_FILTER, context.NEAREST);
            //context.bindTexture(context.TEXTURE_2D, null);
            //console.log('Initialized texture: ' + this.texture.image.src );
        };
        this.texture.image.src = textureImage;
        //this.texture.image.src = 'marstexture.jpg';
    }
    else {
        //textureImage is an index in the video array
        this.texture.image = videos[textureImage].canvas;
        context.pixelStorei(context.UNPACK_FLIP_Y_WEBGL, true);
        context.bindTexture(context.TEXTURE_2D, this.texture);
        context.texImage2D(context.TEXTURE_2D, 0, context.RGBA, context.RGBA, context.UNSIGNED_BYTE, this.texture.image);
        context.texParameteri(context.TEXTURE_2D, context.TEXTURE_MAG_FILTER, context.NEAREST);
        context.texParameteri(context.TEXTURE_2D, context.TEXTURE_MIN_FILTER, context.NEAREST);
    }
};

DrawingInformation3D.prototype.updateTexture = function () {
    context.pixelStorei(context.UNPACK_FLIP_Y_WEBGL, true);
    context.bindTexture(context.TEXTURE_2D, that.texture);
    context.texImage2D(context.TEXTURE_2D, 0, context.RGBA, context.RGBA, context.UNSIGNED_BYTE, that.texture.image);
    context.texParameteri(context.TEXTURE_2D, context.TEXTURE_MAG_FILTER, context.NEAREST);
    context.texParameteri(context.TEXTURE_2D, context.TEXTURE_MIN_FILTER, context.NEAREST);
}

DrawingInformation3D.prototype.resizeModel = function (modelData, size) {
    /*var maxRadius = 0;
     for (var i = 0; i < modelData.vertexPositions.length / 3; i++) {
     if (findDistance([0, 0, 0], [modelData.vertexPositions[i], modelData.vertexPositions[i + 1], modelData.vertexPositions[i + 2]]) > maxRadius) {
     maxRadius = findDistance([0, 0, 0], [modelData.vertexPositions[i], modelData.vertexPositions[i + 1], modelData.vertexPositions[i + 2]]);
     //console.log( "New max radius: " + maxRadius );
     }
     }*/
    for (i in modelData.vertexPositions) {
        modelData.vertexPositions[i] = size * modelData.vertexPositions[i] / 2;// / maxRadius;
    }
};

function DrawingInformation2D() {
    this.image;
    this.imageLoaded = false;
}

DrawingInformation2D.prototype.initialize = function (imageToLoad) {
    if (imageToLoad) {
        //this.image = document.getElementById(imageToLoad);
        if (!parseInt(imageToLoad) && !imageToLoad == 0) {
            this.image = new Image();
            this.image.src = imageToLoad;
            var that = this;
            this.image.onload = function () {
                that.imageLoaded = true;
            };
        }
        else {
            this.image = document.getElementById(imageToLoad);
        }
    }
};


