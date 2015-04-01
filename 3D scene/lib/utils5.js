var context;
var contextError = false;
var renderPipeline2D = new Array();
var pickedItem;

function initCanvas(canvas, presetState) {
    if (presetState == '2D') {
        initCanvas2D(canvas);
        return;
    }

    initCanvas3D(canvas);

    if (!context) {
        state = '2D';
        initCanvas2D(canvas);
    }
}

function initCanvas3D(canvas) {
    try {
        context = canvas.getContext('experimental-webgl');
        context.canvasWidth = canvas.width;
        context.canvasHeight = canvas.height;
        context.clearColor(0.0, 0.0, 0.0, 1.0);
        context.enable(context.DEPTH_TEST);
        context.state = '3D';
    } catch (e) {}
}

function initCanvas2D(canvas) {
    try {
        context = canvas.getContext('2d');
        context.canvasWidth = canvas.width;
        context.canvasHeight = canvas.height;
        context.font = '7pt Arial';
        /*if (typeof FlashCanvas != "undefined") {
         context.loadFont("BaroqueScript.swf");
         context.font = "8pt 'Baroque Script'";
         } */
        context.textBaseline = 'bottom';
        context.state = '2D';
    } catch (e) {}
    if (!context) {
        alert("Could not initialize 2D or 3D drawing");
        contextError = true;
    }
}

function getShader(context, id) {
    if (context.state == '2D') {
        return;
    }

    var shaderScript = document.getElementById(id);
    if (!shaderScript) {
        return null;
    }

    var str = "";
    var k = shaderScript.firstChild;
    while (k) {
        if (k.nodeType == 3) {
            str += k.textContent;
        }
        k = k.nextSibling;
    }

    var shader;
    if (shaderScript.type == "x-shader/x-fragment") {
        shader = context.createShader(context.FRAGMENT_SHADER);
    } else if (shaderScript.type == "x-shader/x-vertex") {
        shader = context.createShader(context.VERTEX_SHADER);
    } else {
        return null;
    }

    context.shaderSource(shader, str);
    context.compileShader(shader);

    if (!context.getShaderParameter(shader, context.COMPILE_STATUS)) {
        alert(context.getShaderInfoLog(shader));
        return null;
    }

    return shader;
}

var shaderProgram;

function initShaders() {
    if (context.state == "2D") {
        return;
    }

    var fragmentShader = getShader(context, "shader-fs");
    var vertexShader = getShader(context, "shader-vs");

    shaderProgram = context.createProgram();
    context.attachShader(shaderProgram, vertexShader);
    context.attachShader(shaderProgram, fragmentShader);
    context.linkProgram(shaderProgram);

    if (!context.getProgramParameter(shaderProgram, context.LINK_STATUS)) {
        alert("Could not initialise shaders");
    }

    context.useProgram(shaderProgram);

    shaderProgram.vertexPositionAttribute = context.getAttribLocation(shaderProgram, "aVertexPosition");
    context.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);

    shaderProgram.textureCoordAttribute = context.getAttribLocation(shaderProgram, "aTextureCoord");
    context.enableVertexAttribArray(shaderProgram.textureCoordAttribute);

    //shaderProgram.vertexNormalAttribute = context.getAttribLocation(shaderProgram, "aVertexNormal");
    //context.enableVertexAttribArray(shaderProgram.vertexNormalAttribute);

    shaderProgram.pMatrixUniform = context.getUniformLocation(shaderProgram, "uPMatrix");
    shaderProgram.mvMatrixUniform = context.getUniformLocation(shaderProgram, "uMVMatrix");
    //shaderProgram.nMatrixUniform = context.getUniformLocation(shaderProgram, "uNMatrix");
    shaderProgram.samplerUniform = context.getUniformLocation(shaderProgram, "uSampler");
    shaderProgram.alphaUniform = context.getUniformLocation(shaderProgram, "uAlpha");
}

function drawRenderPipeline2D() {
    renderPipeline2D.sort(compareZ);
    context.fillStyle = 'red';

    for (var a in renderPipeline2D) {
        if (true) {
            //console.log( "Drawing entity at: " + renderPipeline2D[a][0] + " " + renderPipeline2D[a][1] + " with image: " + renderPipeline2D[a][3].src );
            context.save();
            //context.scale( 18/Math.sqrt(renderPipeline2D[a][2]), 18/Math.sqrt(renderPipeline2D[a][2]) );
            context.translate(50 * renderPipeline2D[a][0], 50 * renderPipeline2D[a][1]);
            context.scale(130 * renderPipeline2D[a][4] / renderPipeline2D[a][2], -130 * renderPipeline2D[a][4] / renderPipeline2D[a][2]);
            ////console.log( "Type check: " + renderPipeline2D[a][3].src );
            if (renderPipeline2D[a][3].src || renderPipeline2D[a][3].id) {
                //console.log( "Src: " + renderPipeline2D[a][3].src );
                context.globalAlpha = parseFloat(renderPipeline2D[a][5])*Math.max(0,1 - renderPipeline2D[a][2]/500);
                context.drawImage(renderPipeline2D[a][3], -1, -1, 2, 2);
            }
            else {
                //context.fillRect( -1, -1, 2, 2 );
            }
            /*context.scale(0.2 / renderPipeline2D[a][4], 0.2 / renderPipeline2D[a][4]);
            context.fillText(renderPipeline2D[a][5], 0, 0);*/
            context.restore();
        }
    }
}
;

function compareZ(a, b) {
    return b[2] - a[2];
}

var mvMatrix = mat4.create();
var pMatrix = mat4.create();

function setMatrixUniforms() {
    context.uniformMatrix4fv(shaderProgram.pMatrixUniform, false, pMatrix);
    context.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);
    /*var normalMatrix = mat3.create();
    mat4.toInverseMat3(mvMatrix, normalMatrix);
    mat3.transpose(normalMatrix);
    context.uniformMatrix3fv(shaderProgram.nMatrixUniform, false, normalMatrix);*/
}

function canvasClicked(event) {
    var cursorXY = getCursorPosition(canvas, context.canvasWidth, context.canvasHeight, event);

    pickedItem = undefined;
    var pickingPipeline = new Array();
    sceneRoot.populatePickingPipeline(mvMatrix, pMatrix, pickingPipeline);
    pickingPipeline.sort(compareZ);
    for (var a in pickingPipeline) {
         //console.log( "Comparing: " + pickingPipeline[a].entity.label + " x: " + 50*pickingPipeline[a].x + " y: " + 50*pickingPipeline[a].y );
         //console.log( "Distance: " + findDistance( cursorXY, [50*pickingPipeline[a].x, 50*pickingPipeline[a].y]) + " size: " + 150*pickingPipeline[a].size );

        if (findDistance(cursorXY, {x:50 * pickingPipeline[a].x,y: 50 * pickingPipeline[a].y}) < 150 * pickingPipeline[a].size && pickingPipeline[a].entity.handleClick) {
            pickedItem = pickingPipeline[a].entity;
            break;
        }
    }
    if (pickedItem && pickedItem.handleClick) {
        var percentageCoordinatesOnClickedItem = {x:pickingPipeline[a].range*(cursorXY.x - 50 * pickingPipeline[a].x), y:pickingPipeline[a].range*(cursorXY.y - 50 * pickingPipeline[a].y) }
        pickedItem.handleClick(percentageCoordinatesOnClickedItem);
    }
    else {
        delete mouse.last;
        if ($(event.target).is('a')) {
            return true;
        }

        event.originalEvent.touches ? event = event.originalEvent.touches[0] : null;
        mouse.start.x = event.pageX;
        mouse.start.y = event.pageY;

        $('#3dCanvas').bind('mousemove touchmove', function (event) {
            // Only perform rotation if one touch or mouse (e.g. still scale with pinch and zoom)
            if (!touch || !(event.originalEvent && event.originalEvent.touches.length > 1)) {
                event.preventDefault();
                // Get touch co-ords
                event.originalEvent.touches ? event = event.originalEvent.touches[0] : null;
                console.log('Rotating view');
                viewer.rotateView(mouse, {x:event.pageX, y:event.pageY}, touch);
            }
        });

        $('#3dCanvas').bind('mouseup touchend', function () {
            $('#3dCanvas').unbind('mousemove touchmove');
            $('#3dCanvas').unbind('mouseup touchend');
        });
    }
}

function canMoveForward() {
    var pickingPipeline = new Array();
    sceneRoot.populatePickingPipeline(mvMatrix, pMatrix, pickingPipeline);
    pickingPipeline.sort(compareZ);
    for (var a in pickingPipeline) {
        //console.dir(pickingPipeline[a]);
        if (pickingPipeline[a].range < 2.5*pickingPipeline[a].size && pickingPipeline[a].z > 0 && !pickingPipeline[a].entity.ignoreCollisions) {
            console.log('Stopping forward');
            console.dir(pickingPipeline[a].entity);
            return 'noForward';
        }
        else if(pickingPipeline[a].range < 2.5*pickingPipeline[a].size && pickingPipeline[a].z < 0 && !pickingPipeline[a].entity.ignoreCollisions) {
            console.log('stopping backward');
            return 'noBackward';
        }
    }
    return 'moveAllowed';
}

findDistance = function (pos1, pos2) {
    var xDist = pos1.x - pos2.x;
    var yDist = pos1.y - pos2.y;
    return Math.sqrt(xDist * xDist + yDist * yDist);
};

getCursorPosition = function (canvas, canvasWidth, canvasHeight, event) {
    var x, y;

    //canoffset = findPos( canvas );
    var canOffset = {};
    canOffset.left = 0;
    canOffset.top = 0;
    x = event.clientX + document.body.scrollLeft + document.documentElement.scrollLeft - Math.floor(canOffset.left);
    x = x * 100 / canvasWidth - 50;
    y = event.clientY + document.body.scrollTop + document.documentElement.scrollTop - Math.floor(canOffset.top);
    y = -y * 100 / canvasHeight + 50;

    return {x:x, y:y};
};