'use strict';

angular.module('vocab')
  .controller('UserController', function ($scope, $http, $location, toaster, DatabaseService) {

    //init database
    $scope.db = DatabaseService.connect();

    //redirect if token is set
    DatabaseService.token().then(function(res){
      $location.path('user/logout');
    });

    //set site breadcrumbs
    $scope.$parent.breadcrumbs = {urls: {}};
    if($location.$$url == '/user/login')
      var path = "Login";
    else{
      $scope.$parent.breadcrumbs["back"] = "user/login";
      var path = "Sign Up";
    }
    $scope.$parent.breadcrumbs.urls[path] = null;

    // user signup
    $scope.signup = function () {
      var data = {
        "username": $scope.user.username,
        "password": $scope.user.password,
        "email": $scope.user.email
      };
      $http.post("http://localhost:3000/api/user/signup", data).success(function(data, status) {
        $scope.db.transaction(function(tx) {
          tx.executeSql('DELETE FROM options WHERE key="token"');
          tx.executeSql('INSERT INTO options(key,value) VALUES (?,?)',["token", data.token]);
        });
        toaster.pop({
          type: 'success',
          body: 'Signup successful'
        });
      }).error(function (data, status) {
        toaster.pop({
          type: 'error',
          title: status+ ' Error',
          body: data.message
        });
      });
    }

    // user login
    $scope.login = function () {
      var data = {
          "username": $scope.login.username,
          "password": $scope.login.password
        };
      $http.post("http://localhost:3000/api/user/signin", data).success(function(data, status) {
          $scope.db.transaction(function(tx) {
            tx.executeSql('DELETE FROM options WHERE key="token"');
            tx.executeSql('INSERT INTO options(key,value) VALUES (?,?)',["token", data.token]);
          });
          toaster.pop({
            type: 'success',
            body: 'Login successful'
          });
      }).error(function (data, status) {
        toaster.pop({
          type: 'error',
          title: status+ ' Error',
          body: data.message
        });
      });
    }

  });