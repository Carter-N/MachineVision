//Page load event
$(function(){

  //Setup the camera object to prepare for capturing
  var setupCamera = function(){

    //Setup camera
    Webcam.set({
      width: image.width, height: image.height, image_format: 'jpeg', jpeg_quality: 90, flip_horiz: true
    });
  };

  //Setup the pen and its associative variables
  var setupPen = function(){
    drawingCtx.lineWidth = 2;
    drawingCtx.lineJoin = drawingCtx.lineCap = "round";
  };

  //Webcam capture resolution
  var image = {
    width: 320,
    height: 240
  };

  //Setup the webcam for capturing
  setupCamera();

  //Attach camera stream to video element
  Webcam.attach("#camera");

  //Pen variables
  var pen = {

    //How close a color has to be to be included in object
    //detection algorithm
    colorTolerance: 30,

    //Distance between obects before being considered
    //seperate nodes on the graph
    objectTolerance: 100,

    //Is the user drawing?
    drawing: false,
    color: {},
    lastPosition: {
      x: -1,
      y: -1
    }
  };

  //Camera buffer canvas, this canvas is where vision calculations
  //take place and where visuals are rendered
  var buffer = document.getElementById("buffer-camera");
  var bufferCtx = buffer.getContext("2d");

  //Set buffer canvas dimensions
  buffer.width = image.width;
  buffer.height = image.height;

  //Drawing canvas, where the pen position is rendered as a line
  //from the last position
  var drawing = document.getElementById("drawing");
  var drawingCtx = drawing.getContext("2d");

  //Set drawing canvas dimensions
  drawing.width = image.width;
  drawing.height = image.height;

  //Initialize the pen variables
  setupPen();

  //Toggle drawing event
  $("body").keydown(function(event){

    console.log("toggled drawing event");

    //TODO: set the color to be rendered to reflect the color of
    //the current pen

    //Toggle drawing
    pen.drawing = !pen.drawing;

    //Forget last position if not drawing
    if(pen.drawing === false){
      pen.lastPosition.x = -1;
      pen.lastPosition.y = -1;
    }
  });

  //Canvas mousedown event, when the user wants to pick a color to track
  $(buffer).mousedown(function(event){

    console.log("toggles color pick event");

    //Mouse position relative to the canvas
    var position = $(this).position();
    var x = event.pageX - position.left;
    var y = event.pageY - position.top;

    //Get the RGB color from selected pixel
    var buffer = bufferCtx.getImageData(x, y, 1, 1).data;

    //Parse the color from the data buffer
    var color = {
      red: buffer[0], green: buffer[1], blue: buffer[2], alpha: buffer[3]
    };

    //Color was successfully chosen
    pen.color = color;
  });

  //Track pen position on the buffer canvas
  var trackPen = function(){

    //Update and manipulate the webcam capture buffer
    Webcam.snap(function(){

      //Get the camera buffer data
      var data = bufferCtx.getImageData(0, 0, image.width, image.height);

      //Current number of frame matches
      var framePixels = 0;

      //Pixel data lists
      var dataX = [];
      var dataY = [];

      //Iterate over image data
      for(var x = 0; x < data.width; x++){
        for(var y = 0; y < data.height; y++){

          //Get color components of current pixel
          var red = data.data[((x * (data.width * 4)) + (y * 4))];
          var green = data.data[((x * (data.width * 4)) + (y * 4)) + 1];
          var blue = data.data[((x * (data.width * 4)) + (y * 4)) + 2];
          var alpha = data.data[((x * (data.width * 4)) + (y * 4)) + 3];

          //Test color likeness to selected color
          if(red < pen.color.red + pen.colorTolerance && red > pen.color.red - pen.colorTolerance &&
          green < pen.color.green + pen.colorTolerance && green > pen.color.green - pen.colorTolerance &&
          blue < pen.color.blue + pen.colorTolerance && blue > pen.color.blue - pen.colorTolerance){

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

      //Calculate differences in objects
      var xObjects = [];
      var yObjects = [];

      //Calculate center of object
      if(dataX.length > 0){

        //Sort data
        dataX.sort();
        dataY.sort();

        //Calculate medians of data
        var centerX = dataX[Math.floor(dataX.length / 2)];
        var centerY = dataY[Math.floor(dataY.length / 2)];

        //Paint center of object to the buffer as a rectangle
        for(var xi = centerX - 5; xi < centerX + 5; xi++){
          for(var yi = centerY - 5; yi < centerY + 5; yi++){

            //Highlight the center of the object on the buffer canvas
            data.data[((xi * (data.width * 4)) + (yi * 4))] = 231;
            data.data[((xi * (data.width * 4)) + (yi * 4)) + 1] = 76;
            data.data[((xi * (data.width * 4)) + (yi * 4)) + 2] = 60;
            data.data[((xi * (data.width * 4)) + (yi * 4)) + 3] = 1.0;
          }
        }

        //Push manipulated data to camera buffer
        bufferCtx.putImageData(data, 0, 0);

        //Draw position to drawing canvas
        if(pen.drawing){

          //No points have been recorded yet
          if(pen.lastPosition.x !== -1 && pen.lastPosition.y !== -1){

            //Begin drawing sequence
            drawingCtx.beginPath();

            //Move pen to last position
            drawingCtx.moveTo(pen.lastPosition.y, pen.lastPosition.x);

            //Draw line to current position
            drawingCtx.lineTo(centerY, centerX);

            //Set the color of the stroke and execute movement
            var color = "rgba(" + 
              pen.color.red + "," + 
              pen.color.green + "," + 
              pen.color.red + "," + 
              pen.color.alpha + ")";

            drawingCtx.strokeStyle = color;
            drawingCtx.stroke();
          }

          //Record latest points
          pen.lastPosition.x = centerX;
          pen.lastPosition.y = centerY;
        }
      }
    }, buffer);
  };

  //Update the drawing when the webcam finishes loading
  Webcam.on("load", function(){
    var loop = setInterval(function(){
      trackPen();
    }, 50);
  });
});
