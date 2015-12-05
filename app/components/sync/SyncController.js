'use strict';

angular.module('vocab')
  .controller('SyncController', function ($scope, $http, DatabaseService, toaster) {

    //init database
    $scope.db = DatabaseService.connect();

    //set token
    DatabaseService.token().then(function(res){
      $scope.token = res;
    });

    //set site breadcrumbs
    $scope.$parent.breadcrumbs = {
      urls: {
        "Sync": null
      }
    };

    //send data to server
    $scope.send = function () {
      var data;
      //check token
      if($scope.token){
        DatabaseService.export().then(function (res) {

          res.token = $scope.token;
          $http.post("http://localhost:3000/api/data/import", res).success(function(data, status) {
            toaster.pop({
              type: 'success',
              body: 'Sent successful'
            });
          }).error(function (data, status) {
            toaster.pop({
              type: 'error',
              title: status+ ' Error',
              body: data.message
            });
          });
        });

      }else{
        toaster.pop({
          type: 'warning',
          body: 'Please Sign in Or Sign up '
        });
      }

    }

    //receive data
    $scope.receive = function () {
      //check token
      if($scope.token){
        $http.post("http://localhost:3000/api/data/export", { token: $scope.token }).success(function(data, status) {

          //delete all categories
          DatabaseService.find({ "query": "DELETE FROM category", attr: [] }).then(function(){
            toaster.pop({
              type: 'info',
              body: 'import categories ...'
            });
            data.categories.forEach(function(c){
              //import categories
              $scope.db.transaction(function(tx) {
                tx.executeSql('INSERT INTO category(id,name) VALUES (?,?)', [c.client_id, c.name]);
              });
            });
          });

          //delete all words
          DatabaseService.find({ "query": "DELETE FROM word", attr: [] }).then(function(){
            toaster.pop({
              type: 'info',
              body: 'import words ...'
            });
            data.words.forEach(function(w){
              //import words
              var value = [
                w.name,
                !w.phonetically ? null : w.phonetically,
                !w.meaning ? null : w.meaning,
                !w.example ? null : w.example,
                !w.translate ? null : w.translate,
                !w.category_id ? 0 : w.category_id,
                !w.view_count ? 0 : w.view_count,
                !w.favorite ? 0 : 1
              ]
              $scope.db.transaction(function(tx) {
                tx.executeSql('INSERT INTO word(name,phonetically,meaning,example,translate,category_id, view_count, favorite) VALUES (?,?,?,?,?,?,?,?)', value);
              });
            });
          });
        }).error(function (data, status) {
          toaster.pop({
            type: 'error',
            title: status+ ' Error',
            body: data.message
          });
        });
      }else{
        toaster.pop({
          type: 'warning',
          body: 'Please Sign in Or Sign up '
        });
      }
    }

  });