'use strict'

angular.module('vocab')
  .controller('WordAddController', function($scope, toaster, $location, DatabaseService){

    //init database
    $scope.db = DatabaseService.connect();

    //set site breadcrumbs
    $scope.$parent.breadcrumbs = {
      urls: {
        "New Word": null
      }
    };

    reloadList();

    function reloadList(){
      var q = {
        "query": "SELECT * FROM category",
        attr: []
      }
      DatabaseService.find(q).then(function(res){
        if(res.rows.length > 0){
          $scope.categoryItem = 12;
          $scope.categoryItems = [];
          var i, row, count = res.rows.length;
          for (i = 0; i < count; i++)
          {
            row = res.rows.item(i);
            $scope.categoryItems.push({
              id: row.id,
              name: row.name
            });
          }
        }
      });
    };

    $scope.add = function(){

      //if undefined set null
      var value = [
        $scope.word.name,
        !$scope.word.phonetically ? null : $scope.word.phonetically,
        !$scope.word.meaning ? null : $scope.word.meaning,
        !$scope.word.example ? null : $scope.word.example,
        !$scope.word.translate ? null : $scope.word.translate,
        !$scope.word.category ? 0 : $scope.word.category
      ]

      //insert new category
      $scope.db.transaction(function(tx) {
        tx.executeSql('INSERT INTO word(name,phonetically,meaning,example,translate,category_id) VALUES (?,?,?,?,?,?)',value, successHandler);
      });

      //reset form
      function successHandler() {
        $scope.word = {};
        wordForm.reset();
      }

    };

  })

  .controller('WordListController', function($scope, $routeParams, DatabaseService){

    //init database
    $scope.db = DatabaseService.connect();

    //set site breadcrumbs
    $scope.$parent.breadcrumbs = {
      back: 'category',
      urls: {
        Categories: '#category',
        Words: null
      }
    };

    wordList();

    function wordList(){
      var q = {
        "query": "SELECT * FROM word WHERE category_id=?",
        attr: [$routeParams.id]
      }
      DatabaseService.find(q).then(function(res){
        if(res.rows.length > 0){
          $scope.wordItems = [];
          var i, row, count = res.rows.length;
          for (i = 0; i < count; i++)
          {
            row = res.rows.item(i);
            $scope.wordItems.push({
              id: row.id,
              category_id: row.category_id,
              name: row.name,
              phonetically: row.phonetically,
              meaning: row.meaning,
              example: !row.example ? null : row.example.split(".").filter(function(n){return n}),
              translate: row.translate,
              favorite: row.favorite
            });
          }
        }
      });
    };

    //load categories to list
    reloadList();
    function reloadList(){
      var q = {
        "query": "SELECT * FROM category",
        attr: []
      }
      DatabaseService.find(q).then(function(res){
        if(res.rows.length > 0){
          $scope.categoryItem = 12;
          $scope.categoryItems = [];
          var i, row, count = res.rows.length;
          for (i = 0; i < count; i++)
          {
            row = res.rows.item(i);
            $scope.categoryItems.push({
              id: row.id,
              name: row.name
            });
          }
        }
      });
    };

    //delete word
    $scope.delete = function(id, index){
      var q = {
        "query": "DELETE FROM word WHERE id=?",
        attr: [id]
      }
      DatabaseService.find(q).then(function(res){
        //update list table
        $scope.wordItems.splice(index, 1);
      });
    }

    //set current index
    $scope.edit = function(index){
      $scope.editEntityIndex = index;
      $scope.word = {
        name: $scope.wordItems[index].name,
        category_id: $scope.wordItems[index].category_id,
        phonetically: $scope.wordItems[index].phonetically,
        meaning: $scope.wordItems[index].meaning,
        example: $scope.wordItems[index].example,
        translate: $scope.wordItems[index].translate,
        id: $scope.wordItems[index].id
      }
    }
    //update word
    $scope.update = function(index){
      $scope.db.transaction(function (tx) {
        var value = [
          $scope.word.name,
          $scope.word.category_id,
          $scope.word.phonetically,
          $scope.word.meaning,
          $scope.word.example,
          $scope.word.translate,
          $scope.word.id
        ]
        tx.executeSql('UPDATE word SET name=?, category_id=?, phonetically=?, meaning=?, example=?, translate=? WHERE id=?', value);
      });
      //update table field
      $scope.wordItems[index].name = $scope.word.name
    }

  })

  .controller('WordSliderController', function($scope, $routeParams, $location, DatabaseService){

    //init database
    $scope.db = DatabaseService.connect();
    $scope.wordItems = [];

    //set site breadcrumbs
    $scope.$parent.breadcrumbs = {
      back: 'word/list/'+$routeParams.catId,
      urls: {
        Categories: '#category',
        Words: '#/word/list/'+$routeParams.catId,
        slider: null
      }
    };

    wordList();

    function wordList(){
      var q = {
        "query": "SELECT * FROM word WHERE category_id=?",
        attr: [$routeParams.catId]
      }
      DatabaseService.find(q).then(function(res){
        if(res.rows.length > 0){
          var i, row, count = res.rows.length;
          for (i = 0; i < count; i++)
          {
            row = res.rows.item(i);
            $scope.wordItems.push({
              id: row.id,
              category_id: row.category_id,
              name: row.name,
              phonetically: row.phonetically,
              meaning: row.meaning,
              example: !row.example ? null : row.example.split(".").filter(function(n){return n}),
              translate: row.translate,
              favorite: row.favorite
            });
          }
        }
      });
    };

    //set current id for show item directive
    $scope.currentId = $routeParams.wordId;

    $scope.next = function(id){
      if(!$(".word-active-item").is(':last-child')){
        $(".word-active-item").css({"display": "none"})
          .removeClass("word-active-item")
          .removeClass("word-previous")
          .removeClass("word-previous")
          .next()
          .css({"display": "block"})
          .addClass("word-next")
          .addClass("word-active-item");
      }
    }

    $scope.previous = function(id) {
      if (!$(".word-active-item").is(':first-child')) {
        $(".word-active-item").css({"display": "none"})
          .removeClass("word-active-item")
          .removeClass("word-previous")
          .removeClass("word-next")
          .prev()
          .css({"display": "block"})
          .addClass("word-previous")
          .addClass("word-active-item");
      }
    }

    //delete word
    $scope.delete = function(id, index){
      var q = {
        "query": "DELETE FROM word WHERE id=?",
        attr: [id]
      }
      DatabaseService.find(q).then(function(res){

      });
      //update list table
      $location.path("word/list/"+$routeParams.catId);
    }

    //set current index
    $scope.edit = function(index){
      $scope.editEntityIndex = index;
      $scope.word = {
        name: $scope.wordItems[index].name,
        category_id: $scope.wordItems[index].category_id,
        phonetically: $scope.wordItems[index].phonetically,
        meaning: $scope.wordItems[index].meaning,
        example: $scope.wordItems[index].example,
        translate: $scope.wordItems[index].translate,
        id: $scope.wordItems[index].id
      }
    }
    //update word
    $scope.update = function(index){
      $scope.db.transaction(function (tx) {
        var value = [
          $scope.word.name,
          $scope.word.category_id,
          $scope.word.phonetically,
          $scope.word.meaning,
          $scope.word.example,
          $scope.word.translate,
          $scope.word.id
        ]
        tx.executeSql('UPDATE word SET name=?, category_id=?, phonetically=?, meaning=?, example=?, translate=? WHERE id=?', value);
      });
      //update table field
      $scope.wordItems[index].name = $scope.word.name
      $scope.wordItems[index].phonetically = $scope.word.phonetically
      $scope.wordItems[index].meaning = $scope.word.meaning
      $scope.wordItems[index].example = $scope.word.example
      $scope.wordItems[index].translate = $scope.word.translate
      $scope.wordItems.$apply();
    }

    //favorite word
    $scope.favorite = function (fav, index) {
      $scope.db.transaction(function (tx) {
        tx.executeSql('UPDATE word SET favorite=? WHERE id=?', [fav, $scope.wordItems[index].id]);
      });
      $scope.wordItems[index].favorite = fav;
    }

    //voice element
    $scope.voice = function (word) {
      var element = document.querySelector('#player');
      element.setAttribute('text', word);
      element.speak();
    }

  });
