var CAPITECUTILS = ( function() {
      
  var my = {};
  
  //Private variables
  var waveAmplitude = 1.7;
  
  var hoverInterval = 150;
  var hoverRadius;
  var hoverStartPosition = new Array(2);
  var hoverRadiusInOutRatio = 0.3;
  var hoverCallBack;
  var endHoverCallBack;
  var mouseTimer;
  var mouseOutOfCanvas = true;
  var hovering = false;
  var currentMousePosition = [ -2000, -2000 ];
  var lastMousePosition = [ 2000, 2000 ];
  var mouseStationaryTestPosition = [ 2000, 2000 ];
  
  //Public functions
  my.getCursorPosition = function( canvas, canvasWidth, canvasHeight, event ) 
  {
    var x, y;
  
    canoffset = $(canvas).offset();
    x = event.clientX + document.body.scrollLeft + document.documentElement.scrollLeft - Math.floor(canoffset.left);
    x = x*200/canvasWidth - 100;
    y = event.clientY + document.body.scrollTop + document.documentElement.scrollTop - Math.floor(canoffset.top);
    y = -y*200/canvasHeight + 100;
    
    return [x,y];
  }

  my.linearInterpolate = function( start, finish, step, steps )
  {
    return start + (step/steps)*(finish-start);
  }
    
  my.naturalInterpolate = function( start, finish, step, steps )
  {
    return start + (finish-start)*Math.atan(5*step/steps)/(Math.PI/2) + (finish-start)*CAPITECUTILS.linearInterpolate( 0, Math.PI/2-Math.atan(8), step, steps );
  }
  
  my.arctanInterpolate = function( start, finish, step, steps )
  {
    var x = 10*(step/steps) - 5;
    var range = ( finish - start ) / Math.PI;
    return range*( Math.atan( x ) + Math.PI/2 ) + start + CAPITECUTILS.linearInterpolate( -range/5.1, range/5.1, step, steps );
  }

  my.bumpInterpolate = function( max, start, step, steps )
  {
    var alpha = max - start;
    var x = step/steps;
    return alpha*Math.exp( -8*( x-0.5 )*( x-0.5 ) ) - alpha*Math.exp( -8*( 0.5 )*( 0.5 ) );
  }
  
  my.waveInterpolate = function( max, start, distance, step, steps )
  {
    var alpha = waveAmplitude*( max - start );
    var x = step/steps;
    var variance = 0.005;
    
    return alpha*Math.exp( -1*Math.pow( x-0.4-distance/370, 2) / variance );
  }

  my.findDistance = function( xyAngle1, xyAngle2 )
  {
    var xDist = xyAngle2[0]-xyAngle1[0];
    var yDist = xyAngle2[1]-xyAngle1[1];
    return Math.sqrt( Math.pow( xDist, 2 ) + Math.pow( yDist, 2 ) )
  }
  
  my.zeroArray = function( array )
  {
    for( var i=0; i<array.length; i++ )
    {
      array[i] = 0;
    }
  }

  my.copyObject = function( object ) {
      var ret = {};
      for( var i in object ) {
          ret[i] = object[i];
      }
      return ret;
  }
  
  my.exitCanvasHover = function()
  {
    clearInterval( mouseTimer );
    //TODO
  }
  
  my.setHoverRadius = function( hr )
  {
    hoverRadius = hr;
  }
  
  my.initCanvasHover = function( canvas, canvasWidth, canvasHeight, canvasListener, hr, hcb, ehcb )
  {
    hoverRadius = hr;
    hoverCallBack = hcb;
    endHoverCallBack = ehcb;
    
    canvasListener.mouseout( function() {
      mouseOutOfCanvas = true;
      hovering = false;
      endHoverCallBack();
    });
    
    canvasListener.mouseover( function() {
      mouseOutOfCanvas = false;
      hovering = false;
    });
    
    canvasListener.mousemove( function( event ) { 
      if( !mouseOutOfCanvas )
      {
        currentMousePosition = CAPITECUTILS.getCursorPosition( canvas, canvasWidth, canvasHeight, event );
      }    
    });
       
    clearInterval( mouseTimer );
    mousetimer = setInterval( findCanvasHover, hoverInterval );
  }
  
  findCanvasHover = function()
  {
    if( mouseOutOfCanvas )
    {
      return;
    }
    var dist1 = CAPITECUTILS.findDistance( currentMousePosition, lastMousePosition );
    var dist2 = CAPITECUTILS.findDistance( currentMousePosition, hoverStartPosition );
    
    if( hovering )
    {
      if( dist1 > hoverRadiusInOutRatio*hoverRadius*2 || dist2 > hoverRadiusInOutRatio*hoverRadius*2 )
      {
        endHoverCallBack();
        hovering = false;
      }
    }
    
    else if( dist1 < hoverRadius )
    {
      hovering = true;
      var tmpX = currentMousePosition[0];
      var tmpY = currentMousePosition[1];
      hoverStartPosition = [tmpX, tmpY];
      hoverCallBack( currentMousePosition[0], currentMousePosition[1] );
    }
    
    lastMousePosition = currentMousePosition; 
  }
  
  my.truncate = function( string, length )
  {
    if( string.length < length )
    {
      return string;
    }
    return string.substring( 0, length ) + "...";
  }
  
  my.supportsHistoryApi = function()
  {
    if( navigator.appVersion.indexOf( "MSIE 8" ) != -1 || navigator.appVersion.indexOf( "MSIE 7" ) != -1 || navigator.appVersion.indexOf( "MSIE 9" ) != -1)
    {
      return false;
    }
    return true;
  }
  
  my.isFireFox = function()
  {
    if( navigator.userAgent.indexOf( "Firefox" ) != -1 )
    {
      return true;
    }
    return false; 
  }
    
  return my; 
  
}());