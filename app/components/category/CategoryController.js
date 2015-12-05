'use strict';

angular.module('vocab')
  .controller('CategoryAddController', function ($scope, DatabaseService) {

    //init database
    $scope.db = DatabaseService.connect();

    //set site breadcrumbs
    $scope.$parent.breadcrumbs = {
      back: "category",
      urls: {
        Categories: '#category',
        "New Category": null
      }
    };

    $scope.add = function(){

      var value = [
        $scope.category.name,
        0
      ];

      //insert new category
      $scope.db.transaction(function(tx) {
        tx.executeSql('INSERT INTO category(name,wordCount) VALUES (?,?)',value, successHandler);
      });

      //reset form
      function successHandler() {
        $scope.categoryForm.$setUntouched();
        categoryForm.reset();
      }

    }
  })

  .controller('CategoryListController', function($scope, DatabaseService){

    //init database
    $scope.db = DatabaseService.connect();

    //set site breadcrumbs
    $scope.$parent.breadcrumbs = {
      urls: {
        "Categories": null
      }
    };

    $scope.categoryItems = [];

    // generate category list table
    categoryList();

    function categoryList(){
      var q = {
        "query": "SELECT * FROM category",
        attr: []
      }
      DatabaseService.find(q).then(function(res){
        if(res.rows.length > 0){
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

    //delete category
    $scope.delete = function(id, index){
      //if current entity is open, close edit area
      if(index == $scope.editEntityIndex){
        $('#edit-area').slideUp(200);
      }
      var q = {
        "query": "DELETE FROM category WHERE id=?",
        attr: [id]
      }
      DatabaseService.find(q).then(function(res){
        //update list table
        $scope.categoryItems.splice(index, 1);
      });

      //delete word by category_id
      var q = {
        "query": "DELETE FROM word WHERE category_id=?",
        attr: [id]
      }
      DatabaseService.find(q);

    }

    //show edit area
    $scope.edit = function(index){
      $("html, body").animate({ scrollTop: 0 }, "slow", function(){
        $('#edit-area').slideDown(100);
      });
      $scope.category = {
        id: $scope.categoryItems[index].id,
        name: $scope.categoryItems[index].name
      }
      //set current index
      $scope.editEntityIndex = index;
    }

    //hide edit area
    $('#close-edit-area').on('click', function(){
      $('#edit-area').hide();
    });

    //update category
    $scope.update = function(index){
      $scope.db.transaction(function (tx) {
        tx.executeSql('UPDATE category SET name=? WHERE id=?', [$scope.category.name, $scope.category.id]);
      });
      $scope.categoryItems[index].name = $scope.category.name
      //hide edit area
      $('#edit-area').slideUp(200);
    }

  });


