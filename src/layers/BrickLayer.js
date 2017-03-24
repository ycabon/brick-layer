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

  var brickStylePaths = {
    default: "./bricktop.png",
    lego: "./LegoStud.png"
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
      },

      brickStyle: "default"
    },

    load: function() {
      this.addResolvingPromise(this.layer.load());

      var brickPath = brickStylePaths[this.brickStyle] && require.toUrl(brickStylePaths[this.brickStyle]) || this.brickStyle;

      if (brickPath) {
        this.addResolvingPromise(
          esriRequest(brickPath, {
            responseType: "image",
            allowImageDataAccess: true
          })
          .then(function(response) {
            this._brickTop = response.data;
          }.bind(this))
          .otherwise(function() {
            this._brickTop = null;
          }.bind(this))
        );
      }
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
            var color = colorUtils.sampleAverageColor([0, 0, 0], imageData, c * brickSize, r * brickSize, brickSize, brickSize);
            
            colorUtils.rgb2hsl(color, color);
            
            if (saturate) {
              color[1] *= saturate;
            }

            if (this.hslPalette) {
              colorUtils.colorToPalette(color, color, this.hslPalette);
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

            if (this._brickTop) {
              // Draw the top
              context.drawImage(this._brickTop, c * brickSize + 0.5, r * brickSize + 0.5, brickSize - 0.5, brickSize - 0.5);
            }
          }
        }

        return canvas;
      }.bind(this));
    }


  });

  return BrickLayer;
});
