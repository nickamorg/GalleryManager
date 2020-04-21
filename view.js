let $ = require('jquery')
let fs = require('fs')
var galleryPage = new Vue({
   el: '#galleryPage',
   data: {
      folderHome: null,
      folderPrefix: null,
      folderIndex: 0,
      pictureIndex: 0,
      folderPath: null, 
      pictureName: null,
      pictureNewName: null,
      pictureNewPath: null,
      lastMovementPath: null,
      pictures:  {}
   },

   created: function () {
      window.addEventListener('keydown', this.onkey);
   },

   
})

$( document ).ready(function() {
   $("#select-folder-button").click(function() {
      if ($("#folder-select-input").val() === "") {
         $("#folder-select").trigger('click');
      } else {
         $("#folder-select-page").hide();
         $("#gallery-page").show();
         var directoryPath = $("#folder-select-input").val().split("\\").join("/");
   
         galleryPage.folderPrefix = directoryPath.substring(0, directoryPath.lastIndexOf("/"));
         galleryPage.folderHome = directoryPath.substring(1 + directoryPath.lastIndexOf("/"));
         readSelectedFolder(directoryPath.substring(1 + directoryPath.lastIndexOf("/")), 0);
      }
   });
});

function readSelectedFolder(directoryPath, depth) {
   Vue.set(this.galleryPage.pictures, depth, {
      "folderPath" : directoryPath,
      "pics" : []
   });

   var count = 0;
   var newDepth = 0;
   var filenames = fs.readdirSync(galleryPage.folderPrefix + "/" + directoryPath)

   filenames.forEach(file => {
      var filePath = galleryPage.folderPrefix + "/" + directoryPath + "/" + file;

      var statsObj = fs.statSync(filePath);
         
      if (statsObj.isDirectory()) {
         newDepth += readSelectedFolder(directoryPath + "/" + file, depth + 1 + newDepth);
      } else if (statsObj.isFile()) {
         Vue.set(this.galleryPage.pictures[depth].pics, count, []);
         Vue.set(this.galleryPage.pictures[depth].pics[count], "pictureName", file);
         
         if (this.galleryPage.pictureName == null) {
            this.galleryPage.pictureName = file;
            this.galleryPage.pictureNewName = file;
            this.galleryPage.pictureIndex = count;

            this.galleryPage.folderPath = directoryPath + "/";
            this.galleryPage.pictureNewPath = this.galleryPage.folderPath;
            this.galleryPage.folderIndex = depth;
         }

         count++;
      }
   })

   return 1 + newDepth;
}

$("#folder-select").on('change',function() {
   $("#folder-select-page").hide();
   $("#gallery-page").show();

   var directoryPath = this.files[0].path;
   if (directoryPath.slice(-1) == '/') this.directoryPath = directoryPath.slice(0, -1);

   galleryPage.folderPrefix = directoryPath.substring(0, directoryPath.lastIndexOf("/"));
   galleryPage.folderHome = directoryPath.substring(1 + directoryPath.lastIndexOf("/"));
   readSelectedFolder(directoryPath.substring(1 + directoryPath.lastIndexOf("/")), 0);
});