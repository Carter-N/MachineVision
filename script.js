//When the page loads
$(function(){

  //Image resolution
  var width = 320;
  var height = 240;

  //Setup camera
  Webcam.set({
    width: width, height: height,
    image_format: 'jpeg', jpeg_quality: 90,
    flip_horiz: true
  });

  //Begin streaming
  Webcam.attach("#camera");

  //Pen variables
  var pixelTolerance = 10;
  var colorTolerance = 30;
  var draw = false;
  var penColor = {};

  //Pen position
  var lastX;
  var lastY;

  //Buffer canvas
  var canvas = document.getElementById("buffer-camera");
  var ctx = canvas.getContext("2d");
  canvas.width = width;
  canvas.height = height;

  //Drawing canvas
  var drawing = document.getElementById("drawing");
  var drawCtx = drawing.getContext("2d");
  drawing.width = width;
  drawing.height = height;

  //Setup pen
  drawCtx.lineWidth = 1;
  drawCtx.lineJoin = drawCtx.lineCap = 'round';

  //Detect if the user wants to draw
  $("body").keydown(function(event){
    console.log("drawing: ", draw);
    draw = !draw;

    //Destroy last pos if stopped drawing
    if(draw === false){
      lastX = -1;
      lastY = -1;
    }
  });

  //Color picker
  $(canvas).mousedown(function(event){

    //Mouse position relative to canvas offset
    var position = $(this).position();
    var x = event.pageX - position.left;
    var y = event.pageY - position.top;

    //Get color from selected pixel
    var data = ctx.getImageData(x, y, 1, 1);
    var color = {
      red: data.data[0], green: data.data[1], blue: data.data[2], alpha: data.data[3]
    };

    //Color was successfully chosen
    penColor = color;
  });

  //Track pen position on the buffer canvas
  var trackPen = function(){

    //Update and manipulate the webcam buffer
    Webcam.snap(function(){

      //Get the buffer data
      var data = ctx.getImageData(0, 0, 320, 240);

      //Number of matches this frame
      var framePixels = 0;

      //Pixel data lists
      var dataX = [];
      var dataY = [];

      //Iterate over image data
      for(var x = 0; x < data.width; x++){
        for(var y = 0; y < data.height; y++){

          //Get color components of pixel
          var red = data.data[((x * (data.width * 4)) + (y * 4))];
          var green = data.data[((x * (data.width * 4)) + (y * 4)) + 1];
          var blue = data.data[((x * (data.width * 4)) + (y * 4)) + 2];
          var alpha = data.data[((x * (data.width * 4)) + (y * 4)) + 3];

          //Test color likeness to selected color
          if(red < penColor.red + colorTolerance && red > penColor.red - colorTolerance &&
          green < penColor.green + colorTolerance && green > penColor.green - colorTolerance &&
          blue < penColor.blue + colorTolerance && blue > penColor.blue - colorTolerance){

            //Set pixel to highlight matches
            data.data[((x * (data.width * 4)) + (y * 4))] = 231;
            data.data[((x * (data.width * 4)) + (y * 4)) + 1] = 76;
            data.data[((x * (data.width * 4)) + (y * 4)) + 2] = 60;
            data.data[((x * (data.width * 4)) + (y * 4)) + 3] = 1.0;
            framePixels++;

            //Add data to lists
            dataX.push(x);
            dataY.push(y);
          }
        }
      }

      //Calculate center of object
      if(dataX.length > 0){

        //Sort data
        dataX.sort();
        dataY.sort();

        //Calculate medians of data
        var centerX = dataX[Math.floor(dataX.length / 2)];
        var centerY = dataY[Math.floor(dataY.length / 2)];

        //Paint center of object
        for(var xi = centerX; xi < centerX + 10; xi++){
          for(var yi = centerY; yi < centerY + 10; yi++){
            data.data[((xi * (data.width * 4)) + (yi * 4))] = 231;
            data.data[((xi * (data.width * 4)) + (yi * 4)) + 1] = 76;
            data.data[((xi * (data.width * 4)) + (yi * 4)) + 2] = 60;
            data.data[((xi * (data.width * 4)) + (yi * 4)) + 3] = 1.0;
          }
        }

        //Push data to buffer
        ctx.putImageData(data, 0, 0);

        //Draw position to drawing
        if(draw){

          //No points yet
          if(lastX !== -1 && lastY !== -1){
            drawCtx.beginPath();
            drawCtx.moveTo(lastY, lastX);
            drawCtx.lineTo(centerY, centerX);
            drawCtx.stroke();
          }

          lastX = centerX;
          lastY = centerY;
        }
      }
    }, canvas);
  };

  //Update the drawing when the webcam finishes loading
  Webcam.on("load", function(){
    var loop = setInterval(function(){
      trackPen();
    }, 50);
  });
});
