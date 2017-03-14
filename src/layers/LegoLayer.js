define([
  "require",
  "esri/request",
  "esri/Color",
  "dojox/color",
  "esri/layers/BaseTileLayer"
],
function(
  require,
  esriRequest, Color, dojoxColor,
  BaseTileLayer
) {

  var LegoLayer = BaseTileLayer.createSubclass({
    declaredClass: "LegoLayer",

    properties: {
      layer: null
    },

    load: function() {
      this.addResolvingPromise(this.layer.load());
      this.addResolvingPromise(
        esriRequest(require.toUrl("./legostud.png"), {
          responseType: "image",
          allowImageDataAccess: true
        })
        .then(function(response) {
          this._logo = response.data;
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

        for (var r = 0; r < numBlocks; r++) {
          for (var c = 0; c < numBlocks; c++) {
            var extract = context.getImageData(c * blockSize, r * blockSize, blockSize, blockSize);
            var color = new Color(this.getAverageColor(extract.data));
            var hsl = color.toHsl();
            hsl.s += 60;
            hsl.l += 10;
            color = dojoxColor.fromHsl(hsl);
            context.fillStyle = "rgb(" + color.r + "," + color.g + "," + color.b + ")";
            context.fillRect(c * blockSize, r * blockSize, blockSize, blockSize);
            context.drawImage(this._logo, c * blockSize, r * blockSize, blockSize, blockSize);
          }
        }

        return canvas;
      }.bind(this));
    },

    getImageData: function(out, col, row, blockSize, imageData) {
      var data = imageData.data;
      var w = imageData.width;
      
      for (var y = 0; y < blockSize; y++) {
        for (var x = 0; x < blockSize; x++) {
          var p = (y * blockSize + x) * 4;
          var px = ((row + y) * w + col + x) * 4;

          out[p]     = data[px];
          out[p + 1] = data[px + 1];
          out[p + 2] = data[px + 2];
          out[p + 3] = data[px + 3];
        }
      }

      return out;
    },

    getAverageColor: function(data) {
      var color = [0, 0, 0];
      var stride = 5;
      
      for (var i = 0; i < data.length; i += (stride * 4)) {
        color[0] += data[i];
        color[1] += data[i + 1];
        color[2] += data[i + 2];
      }

      var count = i / (stride * 4);

      color[0] = Math.floor(color[0] / count);
      color[1] = Math.floor(color[1] / count);
      color[2] = Math.floor(color[2] / count);

      return color;
    }


  });

  return LegoLayer;
});
