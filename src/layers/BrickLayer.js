define([
  "require",
  "esri/request",
  "esri/layers/BaseTileLayer"
],
function(
  require,
  esriRequest,
  BaseTileLayer
) {

  /**
   * Snap a rgb color to a palette
   */
  function colorToPalette(out, hsl, palette) {
    // convert the color to HSL to snap the color in linear space

    // find the closest hue
    var distances = palette.map(function(color) {
      return Math.abs(Math.sqrt(Math.pow(color[0] - hsl[0], 2) + Math.pow(color[1] - hsl[1], 2) + Math.pow(color[2] - hsl[2], 2)));
    })
    var smallest = Math.min.apply(null, distances);
    var closestColor = palette[distances.indexOf(smallest)];

    out[0] = closestColor[0];
    out[1] = closestColor[1];
    out[2] = closestColor[2];

    return out;
  }

  function rgb2hsl(out, rgb) {
    // http://www.niwa.nu/2013/05/math-behind-colorspace-conversions-rgb-hsl/
    var r = rgb[0] / 255;
    var g = rgb[1] / 255;
    var b = rgb[2] / 255;

    var min = Math.min(r, g, b);
    var max = Math.max(r, g, b);
    var delta = max - min;
    
    out[0] = out[1] = out[2] = 0;

    // Luminescance
    out[2] = (min + max) * 0.5;

    // calculate saturation
    // no saturation if the rgb values are the same
    if (delta !== 0) {
      if (out[2] < 0.5) {
        out[1] = delta / (max + min);
      }
      else {
        out[1] = delta / (2.0 - delta);
      }
    }

    // calculate hue
    if (delta > 0) {
      if (r === max) {
        out[0] = (g - b) / delta;
      }
      else if (g === max) {
        out[0] = 2.0 + (b - r) / delta;
      }
      else if (b === max) {
        out[0] = 4.0 + (r - g) / delta;
      }

      out[0] = out[0] * 60;
    }

    out[1] = Math.round(out[1] * 100);
    out[2] = Math.round(out[2] * 100);

    return out;
  }

  var BrickLayer = BaseTileLayer.createSubclass({
    declaredClass: "BrickLayer",

    properties: {
      brickSize: 16,

      layer: null,

      palette: null,

      hslPalette: {
        value: null,
        dependsOn: ["palette"],
        get: function() {
          if (!this.palette) {
            return null;
          }

          return this.palette.map(function(color) {
            return rgb2hsl([0, 0, 0], color);
          })
        }
      },

      title: {
        aliasOf: "layer.title"
      }
    },

    load: function() {
      this.addResolvingPromise(this.layer.load());
      this.addResolvingPromise(
        esriRequest(require.toUrl("./bricktop.png"), {
          responseType: "image",
          allowImageDataAccess: true
        })
        .then(function(response) {
          this._bricktop = response.data;
        }.bind(this))
      );
    },

    fetchTile: function(level, row, col) {
      const url = this.layer.getTileUrl(level, row, col);

      return esriRequest(url, {
        responseType: "image",
        allowImageDataAccess: true
      })
      .then(function(response) {
        var image = response.data;
        var width = this.tileInfo.size[0];
        var height = this.tileInfo.size[0];
        var canvas = document.createElement("canvas");
        var context = canvas.getContext("2d");

        canvas.width = width;
        canvas.height = height;
        
        var brickSize = this.brickSize;
        var numBlocks = width / brickSize;

        context.drawImage(image, 0, 0, width, height);
        var imageData = context.getImageData(0, 0, width, height);

        for (var r = 0; r < numBlocks; r++) {
          for (var c = 0; c < numBlocks; c++) {
            var color = this.sampleAverageColor([0, 0, 0], imageData, c * brickSize, r * brickSize, brickSize, brickSize);
            // rgb2hsl(color, color);

            // color[1] *= 4;
            // snap to the 
            if (this.hslPalette) {
              colorToPalette(color, color, this.hslPalette);
            }

            // Draw the color
            // context.fillStyle = "hsl(" + color[0] + "," + color[1] + "%," + color[2] + "%)";
            context.fillStyle = "rgb(" + color[0] + "," + color[1] + "," + color[2] + ")";
            context.fillRect(c * brickSize, r * brickSize, brickSize, brickSize);

            // Draw the top
            context.drawImage(this._bricktop, c * brickSize + 0.5, r * brickSize + 0.5, brickSize - 0.5, brickSize - 0.5);
          }
        }

        return canvas;
      }.bind(this));
    },

    sampleAverageColor: function(out, imageData, x, y, width, height, options) {
      out[0] = 0;
      out[1] = 0;
      out[2] = 0;

      var numSamples = 0;

      // Sample every 5 pixel
      var sampleStride = options && options.sampleStride || 5;

      var data = imageData.data;
      var w = imageData.width;

      for (var j = y; j < y + height; j += sampleStride) {
        for (var i = x; i < x + width; i += sampleStride) {
          // imageData is a flat array of 4 color components
          // calculate the absolute position in the buffer.
          var p = (j * w + i) * 4;
          
          out[0] += data[p];
          out[1] += data[p + 1];
          out[2] += data[p + 2];

          numSamples++;
        }
      }

      out[0] = Math.floor(out[0] / numSamples);
      out[1] = Math.floor(out[1] / numSamples);
      out[2] = Math.floor(out[2] / numSamples);

      return out;
    }


  });

  return BrickLayer;
});
