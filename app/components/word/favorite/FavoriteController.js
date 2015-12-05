'use strict'

angular.module('vocab')
  .controller('FavoriteListController', function($scope, $routeParams, DatabaseService){

    //init database
    $scope.db = DatabaseService.connect();

    //set site breadcrumbs
    $scope.$parent.breadcrumbs = {
      urls: {
        "Favorite Words": null
      }
    };

    wordList();

    function wordList(){
      var q = {
        "query": "SELECT * FROM word WHERE favorite=?",
        attr: [1]
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
  })

  .controller('FavoriteSliderController', function($scope, $routeParams, DatabaseService){

    //init database
    $scope.db = DatabaseService.connect();
    $scope.wordItems = [];

    //set site breadcrumbs
    $scope.$parent.breadcrumbs = {
      back: 'favorite/list/',
      urls: {
        "Favorite Words": '#/favorite/list/',
        slider: null
      }
    };

    wordList();

    function wordList(){
      var q = {
        "query": "SELECT * FROM word WHERE favorite=?",
        attr: [1]
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

    //favorite word
    $scope.favorite = function (fav, index) {
      $scope.db.transaction(function (tx) {
        tx.executeSql('UPDATE word SET favorite=? WHERE id=?', [fav, $scope.wordItems[index].id]);
      });
      $scope.wordItems[index].favorite = fav;
    }

  })