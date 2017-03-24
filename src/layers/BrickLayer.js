define([
  "require",
  "esri/request",
  "esri/layers/BaseTileLayer",

  "./colorUtils"
],
function(
  require,
  esriRequest,
  BaseTileLayer,
  colorUtils
) {

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
            return colorUtils.rgb2hsl([0, 0, 0], color);
          })
        }
      },

      filter: null,

      title: {
        aliasOf: "layer.title"
      },

      attributionDataUrl: {
        aliasOf: "layer.attributionDataUrl"
      },

      tileInfo: {
        aliasOf: "layer.tileInfo"
      },

      fullExtent: {
        aliasOf: "layer.fullExtent"
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
        var filter = this.filter;
        var saturate = filter && filter.saturate;
        var darken = filter && filter.darken;
        var lighten = filter && filter.lighten;

        canvas.width = width;
        canvas.height = height;
        
        var brickSize = this.brickSize;
        var numBlocks = width / brickSize;

        context.drawImage(image, 0, 0, width, height);
        var imageData = context.getImageData(0, 0, width, height);

        for (var r = 0; r < numBlocks; r++) {
          for (var c = 0; c < numBlocks; c++) {
            var color = this.sampleAverageColor([0, 0, 0], imageData, c * brickSize, r * brickSize, brickSize, brickSize);
            
            colorUtils.rgb2hsl(color, color);
            // if (this.hslPalette) {
            //   colorUtils.colorToPalette(color, color, this.hslPalette);
            // }

            if (saturate) {
              color[1] *= saturate;
            }

            if (darken) {
              color[2] -= color[2] * darken;
            }
            else if (lighten) {
              color[2] *= lighten;
            }

            context.fillStyle = "hsl(" + color[0] + "," + color[1] + "%," + color[2] + "%)";

            // Draw the color
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
