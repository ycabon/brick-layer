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

  var BrickLayer = BaseTileLayer.createSubclass({
    declaredClass: "BrickLayer",

    properties: {
      layer: null
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
        
        var bounds = this.getTileBounds(level, row, col, [0, 0, 0, 0]);
        var resolution = (bounds[2] - bounds[0]) / this.tileInfo.size[0];
        // var blockSize = Math.max(1, Math.round(this.tileInfo.lods[0].resolution * 2 / resolution));
        var blockSize = 16;
        var numBlocks = width / blockSize;

        context.drawImage(image, 0, 0, width, height);
        var imageData = context.getImageData(0, 0, width, height);

        for (var r = 0; r < numBlocks; r++) {
          for (var c = 0; c < numBlocks; c++) {
            // var color = new Color(this.sampleAverageColor([0, 0, 0], imageData, c * numBlocks, r * numBlocks, blockSize, blockSize));
            // var hsl = color.toHsl();
            // hsl.s += 60;
            // hsl.l -= 10;
            // color = dojoxColor.fromHsl(hsl);
            // context.fillStyle = "rgb(" + color.r + "," + color.g + "," + color.b + ")";

            var color = this.sampleAverageColor([0, 0, 0], imageData, c * blockSize, r * blockSize, blockSize, blockSize);

            context.fillStyle = "rgb(" + color[0] + "," + color[1] + "," + color[2] + ")";
            context.fillRect(c * blockSize, r * blockSize, blockSize, blockSize);
            context.drawImage(this._bricktop, c * blockSize, r * blockSize, blockSize, blockSize);
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
