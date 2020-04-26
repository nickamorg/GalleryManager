let $ = require('jquery')
let fs = require('fs')

var INVALID_FILE_CHARS_REGEX = '^[^\\\\*/:"?|<>]*$';
var INVALID_FOLDER_CHARS_REGEX = '^[^*:"?|<>]*$';
var imageFormats = [".PNG", ".JPG", ".JPEG", ".GIF"];
var videoFormats = [".MP4", ".MOV", ".MKV"];

function isValidFileName(fileName) {
   if (!fileName.match(INVALID_FILE_CHARS_REGEX)) {
      snackbar.expandSnackbar(3, "<span style='color:red'>A file name can't contain any of the following characters \ / : * ? \" < > |</span>");
      return false;
   }

   return true;
}

function isValidFolderName(fileName) {
   if (!fileName.match(INVALID_FOLDER_CHARS_REGEX)) {
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
      expandedFolderIndex: 0,
      showFoldersDropdown: false,
      folderIndex: 0,
      fileIndex: 0,
      folderPrefix: null,
      folderHome: null,
      folderPath: null, 
      fileName: null,
      fileFormat: null,
      fileNewName: null,
      fileNewPath: null,
      lastMovementPath: null,
      gallery:  {}
   },

   created: function () {
      window.addEventListener('keydown', this.onkey);
   },

   computed: {
      activeFolders: function() {
         return Object.keys(this.gallery).map(key => { return this.gallery[key]})
         .filter(pic => { return pic.folderPath != this.folderPath});
      }
   },

   watch: {
      'fileNewName': function(val) { },

      'fileNewPath': function(val) { }
   },

   methods: {
      onkey(event) {         
         if ($("input").is(":focus")) return;

         switch(event.which) {
            case 37: // left
               this.previousFile();
               break;
            case 38: // up
               this.previousFile();
               this.previousFile();
               break;
            case 39: // right
               this.nextFile();
               break;
            case 40: // down
               this.nextFile();
               this.nextFile();
               break;
            case 46: // Delete
            case 68: // D - Delete
               this.deleteFile();
               break;
            case 76: // L - Move to last folder
               this.moveFileToLastPath();
               break;
            case 77: // M - Move
               this.moveFile();
               break;
            case 82: // R - Rename
               this.renameFile();
               break;
            default: return;
         }
      },

      nextFile() {
         if (this.fileIndex < this.gallery[this.folderIndex].pics.length - 1) {
            this.fileIndex++;
            document.getElementById("pic" + this.fileIndex).scrollIntoView();
            this.setupAfterFileIndexChanged();
         }
      },

      previousFile() {
         if (this.fileIndex > 0) {
            this.fileIndex--;
            document.getElementById("pic" + this.fileIndex).scrollIntoView();
            this.setupAfterFileIndexChanged();
         }
      },

      displayFile(folderIndex, fileIndex) {
         this.folderIndex = folderIndex;
         this.expandedFolderIndex = folderIndex;
         this.fileIndex = fileIndex;

         this.setupAfterFileIndexChanged();
      },

      renameFile() {
         if (!isValidFileName(this.fileNewName)) return;

         var from = this.folderPrefix + this.folderHome + this.folderPath + this.fileName + this.fileFormat;
         var to = this.folderPrefix + this.folderHome + this.folderPath + this.fileNewName + this.fileFormat;

         this.fileName = this.fileNewName;
         this.gallery[this.folderIndex].pics[this.fileIndex].fileName = this.fileNewName;

         fs.renameSync(from, to);

         snackbar.expandSnackbar(3, "File Renamed Successfully");
      },

      moveFile() {
         if (this.fileNewPath == this.folderPath) return;
         if (!isValidFolderName(this.fileNewPath)) return;

         this.fileNewPath = this.fileNewPath.split("\\").join("/");
         this.fileNewPath = trimMultipleSlashes(this.fileNewPath);

         if (this.fileNewPath.slice(-1) == '/') this.fileNewPath = this.fileNewPath.slice(0, -1);
         
         var folders = this.fileNewPath.split("/");
         var currentFolderPath = "";
         var newFolder = false;
         var depth = -1;

         // Create folder path if not exists
         for (var index in folders) {
            currentFolderPath += folders[index] + "/";

            if (!fs.existsSync(this.folderPrefix + this.folderHome + currentFolderPath)) {
               fs.mkdirSync(this.folderPrefix + this.folderHome + currentFolderPath);

               depth = Object.keys(this.gallery).length;
               
               Vue.set(this.gallery, depth, {
                  "folderPath" : currentFolderPath,
                  "pics" : []
               });

               newFolder = true;
            }
         }

         if (this.fileNewPath == "") depth = 0;

         // If the folder path exists, find the right index of Vue data
         if (depth == -1) {
            this.fileNewPath += '/';
            for (depth in this.gallery) {
               if (this.gallery[depth].folderPath == this.fileNewPath) {
                  break;
               }
            }
         }
         
         var fromFile = this.folderPrefix + this.folderHome + this.folderPath + this.fileName + this.fileFormat;
         var toFile = this.folderPrefix + this.folderHome + currentFolderPath + "/" + this.fileName + this.fileFormat;
         
         fs.renameSync(fromFile, toFile);
         
         var nextIndex  = this.gallery[depth].pics.length;
         if (newFolder) {
            nextIndex  = 0;
            Vue.set(this.gallery[depth], "folderPath", currentFolderPath);
         }
         Vue.set(this.gallery[depth].pics, nextIndex, []);
         Vue.set(this.gallery[depth].pics[nextIndex], "fileName", this.fileName);
         Vue.set(this.gallery[depth].pics[nextIndex], "fileFormat", this.fileFormat);

         this.lastMovementPath = this.fileNewPath;
         
         snackbar.expandSnackbar(3, "File Moved to '" + this.folderHome + this.fileNewPath + "' Successfully");

         if (this.fileIndex == this.gallery[this.folderIndex].pics.length - 1) {
            this.$delete(this.gallery[this.folderIndex].pics, this.fileIndex);
            this.fileIndex--;
         } else {
            this.$delete(this.gallery[this.folderIndex].pics, this.fileIndex);
         }

         this.setupAfterFileIndexChanged();
      },

      moveFileToLastPath() {
         if (this.lastMovementPath != null && this.lastMovementPath != this.folderPath) {
            this.fileNewPath = this.lastMovementPath;
            this.moveFile();
         }
      },

      enterFoldersDropdown() {
         this.showFoldersDropdown = true;
      },

      exitFoldersDropdown() {
         this.showFoldersDropdown = false;
      },

      moveToDropdownFolder(folderPath) {
         this.fileNewPath = folderPath;
         this.showFoldersDropdown = false;

         this.moveFile();
      },

      deleteFile() {
         fs.unlinkSync(this.folderPrefix + this.folderHome + this.folderPath + this.fileName + this.fileFormat);

         if (this.fileIndex == this.gallery[this.folderIndex].pics.length - 1) {
            this.$delete(this.gallery[this.folderIndex].pics, this.fileIndex);
            this.fileIndex--;
         } else {
            this.$delete(this.gallery[this.folderIndex].pics, this.fileIndex);
         }

         this.setupAfterFileIndexChanged();

         snackbar.expandSnackbar(3, "File Deleted Successfully");
      },

      expandFolder(index) {
         if (this.gallery[index].pics.length == 0) return;

         this.expandedFolderIndex = this.expandedFolderIndex == index ? -1 : index;

         $('#folder' + index).toggle();

         for (var i in Object.keys(this.gallery)) {
            if (i != index) $('#folder' + i).hide();
         }
      },

      setupAfterFileIndexChanged() {
         this.folderPath = this.gallery[this.folderIndex].folderPath;
         this.fileNewPath = this.folderPath;
         this.fileFormat = this.gallery[this.folderIndex].pics[this.fileIndex].fileFormat;
         this.fileName = this.gallery[this.folderIndex].pics[this.fileIndex].fileName;
         this.fileNewName = this.fileName;
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
   Vue.set(this.galleryPage.gallery, depth, {
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
         var fileName = file.substring(0, file.lastIndexOf("."));
         var fileFormat = file.substring(file.lastIndexOf("."));

         if (!imageFormats.includes(fileFormat.toUpperCase()) && !videoFormats.includes(fileFormat.toUpperCase())) return;

         Vue.set(this.galleryPage.gallery[depth].pics, count, []);
         Vue.set(this.galleryPage.gallery[depth].pics[count], "fileName", fileName);
         Vue.set(this.galleryPage.gallery[depth].pics[count], "fileFormat", fileFormat);
         
         if (this.galleryPage.fileName == null) {
            this.galleryPage.fileName = fileName;
            this.galleryPage.fileNewName = fileName;
            this.galleryPage.fileFormat = fileFormat;
            this.galleryPage.fileIndex = count;

            this.galleryPage.folderPath = directoryPath;
            this.galleryPage.fileNewPath = this.galleryPage.folderPath;
            this.galleryPage.folderIndex = depth;
            this.galleryPage.expandedFolderIndex = depth;
         }

         count++;
      }
   })

   if (depth == 0 && this.galleryPage.gallery[0].pics.length > 0) {
      this.galleryPage.fileName = this.galleryPage.gallery[0].pics[0].fileName;
      this.galleryPage.fileNewName = this.galleryPage.gallery[0].pics[0].fileName;
      this.galleryPage.fileFormat = this.galleryPage.gallery[0].pics[0].fileFormat;
      this.galleryPage.fileIndex = 0;

      this.galleryPage.folderPath = this.galleryPage.gallery[0].folderPath;
      this.galleryPage.fileNewPath = this.galleryPage.gallery[0].folderPath;
      this.galleryPage.folderIndex = 0;
      this.galleryPage.expandedFolderIndex = 0;
   }

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