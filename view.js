let $ = require('jquery')
let fs = require('fs')

var INVALID_FILE_CHARS_REGEX = '^[^\\\\*/:"?|<>]*$';
var INVALID_FOLDER_CHARS_REGEX = '^[^*:"?|<>]*$';

function isValidFileName(fileName) {
   if(!fileName.match(INVALID_FILE_CHARS_REGEX)) {
      snackbar.expandSnackbar(3, "<span style='color:red'>A file name can't contain any of the following characters \ / : * ? \" < > |</span>");
      return false;
   }

   return true;
}

function isValidFolderName(fileName) {
   if(!fileName.match(INVALID_FOLDER_CHARS_REGEX)) {
      snackbar.expandSnackbar(3, "<span style='color:red'>A folder path can't contain any of the following characters : * ? \" < > |</span>");
      return false;
   }

   return true;
}

function trimMultipleSlashes(str) {
   return str.replace(/\/+/g, '/');
}

var snackbar = new Vue({
   el: '#snackbar',
   methods: {
       expandSnackbar(time, text) {
           var elem = document.getElementById("snackbar");
           elem.innerHTML = text;
           elem.className = "show";
           setTimeout(function(){ elem.className = elem.className.replace("show", ""); }, time * 1000);
       }
   }
});

var galleryPage = new Vue({
   el: '#galleryPage',
   data: {
      folderIndex: 0,
      pictureIndex: 0,
      folderPrefix: null,
      folderHome: null,
      folderPath: null, 
      pictureName: null,
      pictureFormat: null,
      pictureNewName: null,
      pictureNewPath: null,
      lastMovementPath: null,
      pictures:  {}
   },

   created: function () {
      window.addEventListener('keydown', this.onkey);
   },

   watch: {
      'pictureNewName': function(val) { },

      'pictureNewPath': function(val) { }
   },

   methods: {
      onkey(event) {         
         if ($("input").is(":focus")) return;

         switch(event.which) {
            case 37: // left
               this.previousPicture();
               break;
            case 38: // up
               this.previousPicture();
               this.previousPicture();
               break;
            case 39: // right
               this.nextPicture();
               break;
            case 40: // down
               this.nextPicture();
               this.nextPicture();
               break;
            case 46: // Delete
            case 68: // D - Delete
               this.deletePicture();
               break;
            case 76: // L - Move to last folder
               this.movePictureToLastPath();
               break;
            case 77: // M - Move
               this.movePicture();
               break;
            case 82: // R - Rename
               this.renamePicture();
               break;
            default: return;
         }
      },

      nextPicture() {
         if (this.pictureIndex < this.pictures[this.folderIndex].pics.length - 1) {
            this.setupAfterPictureIndexChanged();
            this.pictureIndex++;
         }
      },

      previousPicture() {
         if (this.pictureIndex > 0) {
            this.setupAfterPictureIndexChanged();
            this.pictureIndex--;
         }
      },

      displayPicture(folderIndex, pictureIndex) {
         this.folderIndex = folderIndex;
         this.pictureIndex = pictureIndex;

         this.setupAfterPictureIndexChanged();
      },

      renamePicture() {
         if(!isValidFileName(this.pictureNewName)) return;

         var from = this.folderPrefix + this.folderHome + this.folderPath + this.pictureName + this.pictureFormat;
         var to = this.folderPrefix + this.folderHome + this.folderPath + this.pictureNewName + this.pictureFormat;

         this.pictureName = this.pictureNewName;
         this.pictures[this.folderIndex].pics[this.pictureIndex].pictureName = this.pictureNewName;

         fs.renameSync(from, to);

         snackbar.expandSnackbar(3, "Image Renamed Successfully");
      },

      movePicture() {
         if (this.pictureNewPath == this.folderPath) return;
         if(!isValidFolderName(this.pictureNewPath)) return;

         this.pictureNewPath = this.pictureNewPath.split("\\").join("/");
         this.pictureNewPath = trimMultipleSlashes(this.pictureNewPath);

         if (this.pictureNewPath.slice(-1) == '/') this.pictureNewPath = this.pictureNewPath.slice(0, -1);
         
         var folders = this.pictureNewPath.split("/");
         var currentFolderPath = "";
         var newFolder = false;
         var depth = -1;

         // Create folder path if not exists
         for (var index in folders) {
            currentFolderPath += folders[index] + "/";

            if (!fs.existsSync(this.folderPrefix + this.folderHome + currentFolderPath)) {
               fs.mkdirSync(this.folderPrefix + this.folderHome + currentFolderPath);

               depth = Object.keys(this.pictures).length;
               
               Vue.set(this.pictures, depth, {
                  "folderPath" : currentFolderPath,
                  "pics" : []
               });

               newFolder = true;
            }
         }

         if (this.pictureNewPath == "") depth = 0;

         // If the folder path exists, find the right index of Vue data
         if (depth == -1) {
            this.pictureNewPath += '/';
            for (depth in this.pictures) {
               if (this.pictures[depth].folderPath == this.pictureNewPath) {
                  break;
               }
            }
         }
         
         var fromFile = this.folderPrefix + this.folderHome + this.folderPath + this.pictureName + this.pictureFormat;
         var toFile = this.folderPrefix + this.folderHome + currentFolderPath + "/" + this.pictureName + this.pictureFormat;
         
         fs.renameSync(fromFile, toFile);
         
         if (newFolder) {
            Vue.set(this.pictures[depth], "folderPath", currentFolderPath);
            Vue.set(this.pictures[depth].pics, 0, []);
            Vue.set(this.pictures[depth].pics[0], "pictureName", this.pictureName);
            Vue.set(this.pictures[depth].pics[0], "pictureFormat", this.pictureFormat);
         } else {
            var nextIndex  = this.pictures[depth].pics.length;
            Vue.set(this.pictures[depth].pics, nextIndex, []);
            Vue.set(this.pictures[depth].pics[nextIndex], "pictureName", this.pictureName);
            Vue.set(this.pictures[depth].pics[nextIndex], "pictureFormat", this.pictureFormat);
         }

         this.lastMovementPath = this.pictureNewPath;
         
         snackbar.expandSnackbar(3, "Image Moved to '" + this.folderHome + this.pictureNewPath + "' Successfully");

         if (this.pictureIndex == this.pictures[this.folderIndex].pics.length - 1) {
            this.$delete(this.pictures[this.folderIndex].pics, this.pictureIndex);
            this.pictureIndex--;
         } else {
            this.$delete(this.pictures[this.folderIndex].pics, this.pictureIndex);
         }

         this.setupAfterPictureIndexChanged();
      },

      movePictureToLastPath() {
         if (this.lastMovementPath != null && this.lastMovementPath != this.folderPath) {
            this.pictureNewPath = this.lastMovementPath;
            this.movePicture();
         }
      },

      deletePicture() {
         fs.unlinkSync(this.folderPrefix + this.folderHome + this.folderPath + this.pictureName + this.pictureFormat);

         if (this.pictureIndex == this.pictures[this.folderIndex].pics.length - 1) {
            this.$delete(this.pictures[this.folderIndex].pics, this.pictureIndex);
            this.pictureIndex--;
         } else {
            this.$delete(this.pictures[this.folderIndex].pics, this.pictureIndex);
         }

         this.setupAfterPictureIndexChanged();

         snackbar.expandSnackbar(3, "Image Deleted Successfully");
      },

      expandFolder(index) {
         $('#folder' + index).toggle();

         for (var i in Object.keys(this.pictures)) {
            if (i != index) $('#folder' + i).hide();
         }
      },

      setupAfterPictureIndexChanged() {
         this.folderPath = this.pictures[this.folderIndex].folderPath;
         this.pictureNewPath = this.folderPath;
         this.pictureFormat = this.pictures[this.folderIndex].pics[this.pictureIndex].pictureFormat;
         this.pictureName = this.pictures[this.folderIndex].pics[this.pictureIndex].pictureName;
         this.pictureNewName = this.pictureName;
      },

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
         if (directoryPath.slice(-1) == '/') directoryPath = directoryPath.slice(0, -1);

         galleryPage.folderPrefix = directoryPath.substring(0, directoryPath.lastIndexOf("/") + 1);
         galleryPage.folderHome = directoryPath.substring(1 + directoryPath.lastIndexOf("/")) + '/';
         readSelectedFolder("", 0);
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
   var filenames = fs.readdirSync(galleryPage.folderPrefix + galleryPage.folderHome + directoryPath)

   filenames.forEach(file => {
      var filePath = galleryPage.folderPrefix + galleryPage.folderHome + directoryPath + "/" + file;

      var statsObj = fs.statSync(filePath);
         
      if (statsObj.isDirectory()) {
         newDepth += readSelectedFolder(directoryPath + file + "/", depth + 1 + newDepth);
      } else if (statsObj.isFile()) {
         var pictureName = file.substring(0, file.lastIndexOf("."));
         var pictureFormat = file.substring(file.lastIndexOf("."));

         Vue.set(this.galleryPage.pictures[depth].pics, count, []);
         Vue.set(this.galleryPage.pictures[depth].pics[count], "pictureName", pictureName);
         Vue.set(this.galleryPage.pictures[depth].pics[count], "pictureFormat", pictureFormat);
         
         if (this.galleryPage.pictureName == null) {
            this.galleryPage.pictureName = pictureName;
            this.galleryPage.pictureNewName = pictureName;
            this.galleryPage.pictureFormat = pictureFormat;
            this.galleryPage.pictureIndex = count;

            this.galleryPage.folderPath = directoryPath;
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
   directoryPath = directoryPath.split("\\").join("/");

   galleryPage.folderPrefix = directoryPath.substring(0, directoryPath.lastIndexOf("/") + 1);
   galleryPage.folderHome = directoryPath.substring(1 + directoryPath.lastIndexOf("/")) + '/';
   readSelectedFolder("", 0);
});