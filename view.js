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

   watch: {
      'pictureNewPath': function(val) { }
   },

   methods: {
      nextPicture() {
         if (this.pictureIndex < this.pictures[this.folderIndex].pics.length - 1) {
            this.folderPath = this.pictures[this.folderIndex].folderPath + "/";
            this.pictureNewPath = this.folderPath;
            this.pictureName = this.pictures[this.folderIndex].pics[++this.pictureIndex].pictureName;
            this.pictureNewName = this.pictureName;
         }
      },

      previousPicture() {
         if (this.pictureIndex > 0) {
            this.folderPath = this.pictures[this.folderIndex].folderPath + "/";
            this.pictureNewPath = this.folderPath;
            this.pictureName = this.pictures[this.folderIndex].pics[--this.pictureIndex].pictureName;
            this.pictureNewName = this.pictureName;
         }
      },

      movePicture() {
         if (this.pictureNewPath == this.folderPath) return;

         this.pictureNewPath = this.pictureNewPath.split("\\").join("/");

         if (!this.pictureNewPath.startsWith(this.folderHome)) {
            this.pictureNewPath = this.folderHome + "/" + this.pictureNewPath;
         }

         var folders = this.pictureNewPath.split("/");

         var currentFolderPath = "";
         var depth = -1;
         var newFolder = false;

         // Create folder path if not exists
         for (var index in folders) {
            currentFolderPath += folders[index] + "/";
            if (!fs.existsSync(this.folderPrefix + "/" + currentFolderPath)) {
               fs.mkdirSync(this.folderPrefix + "/" + currentFolderPath);

               depth = Object.keys(this.pictures).length;
               Vue.set(this.pictures, depth, {
                  "folderPath" : currentFolderPath,
                  "pics" : []
               });
               newFolder = true;
            }
         }

         // If the folder path exists, find the right index of Vue data
         if (!newFolder) {
            for (depth in this.pictures) {
               console.log(this.pictures[depth].folderPath + "    " + this.pictureNewPath);
               if (this.pictures[depth].folderPath == this.pictureNewPath) {
                  break;
               }
            }
         }
         
         var fromFile = this.folderPrefix + "/" + this.folderPath + this.pictureName;
         var toFile = this.folderPrefix + "/" + currentFolderPath + "/" + this.pictureName;
         
         fs.renameSync(fromFile, toFile);
         
         if (newFolder) {
            Vue.set(this.pictures[depth], "folderPath", currentFolderPath.substring(0, currentFolderPath.length - 1));
            Vue.set(this.pictures[depth].pics, 0, []);
            Vue.set(this.pictures[depth].pics[0], "pictureName", this.pictureName);
         } else {
            var nextIndex  = this.pictures[depth].pics.length;
            Vue.set(this.pictures[depth].pics, nextIndex, []);
            Vue.set(this.pictures[depth].pics[nextIndex], "pictureName", this.pictureName);
         }

         this.lastMovementPath = this.pictureNewPath;
         if (this.lastMovementPath.slice(-1) != '/') this.lastMovementPath += '/';
         
         if (this.pictureIndex == this.pictures[this.folderIndex].pics.length - 1) {
            this.$delete(this.pictures[this.folderIndex].pics, this.pictureIndex);
            this.pictureIndex--;
         } else {
            this.$delete(this.pictures[this.folderIndex].pics, this.pictureIndex);
         }

         this.folderPath = this.pictures[this.folderIndex].folderPath + "/";
         this.pictureNewPath = this.folderPath;
         this.pictureName = this.pictures[this.folderIndex].pics[this.pictureIndex].pictureName;
         this.pictureNewName = this.pictureName;
      },

      movePictureToLastPath() {
         if (this.lastMovementPath != null && this.lastMovementPath != this.folderPath) {
            if (this.lastMovementPath.slice(-1) == '/' || this.lastMovementPath.slice(-1) == '\\') { 
               this.lastMovementPath = this.lastMovementPath.slice(0, -1);
            }
            this.pictureNewPath = this.lastMovementPath;
            this.movePicture();
         }
      }
   }
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