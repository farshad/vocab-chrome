'use strict';

/**
 * @ngdoc overview
 * @name agnTestApp
 * @description
 * # agnTestApp
 *
 * Main module of the application.
 */
angular
  .module('vocab', [
    'ngAnimate',
    'ngMessages',
    'ngResource',
    'ngRoute',
    'angular.chosen',
    'toaster'
  ])

  .config(function ($routeProvider, $compileProvider) {

    $compileProvider.aHrefSanitizationWhitelist(/^\s*(https?|ftp|mailto|chrome-extension):/);
    $compileProvider.imgSrcSanitizationWhitelist(/^\s*(https?|ftp|mailto|chrome-extension):/);

    $routeProvider
      .when('/', {
        controller: 'MainCtrl',
        controllerAs: 'main'
      })
      .when('/category', {
        templateUrl: '../components/category/list.html',
        controller: 'CategoryListController'
      })
      .when('/category/new', {
        templateUrl: '../components/category/new.html',
        controller: 'CategoryAddController'
      })
      .when('/category/:id/edit', {
        templateUrl: '../components/category/edit.html',
        controller: 'CategoryEditController'
      })
      .when('/word/new', {
        templateUrl: '../components/word/new.html',
        controller: 'WordAddController'
      })
      .when('/word/list/:id', {
        templateUrl: '../components/word/list.html',
        controller: 'WordListController'
      })
      .when('/word/slider/:catId/:wordId', {
        templateUrl: '../components/word/slider.html',
        controller: 'WordSliderController'
      })
      .when('/favorite/list', {
        templateUrl: '../components/word/favorite/list.html',
        controller: 'FavoriteListController'
      })
      .when('/favorite/slider/:wordId', {
        templateUrl: '../components/word/favorite/slider.html',
        controller: 'FavoriteSliderController'
      })
      .when('/user/login', {
        templateUrl: '../components/user/login.html',
        controller: 'UserController'
      })
      .when('/user/logout', {
        templateUrl: '../components/user/logout.html',
        controller: 'UserController'
      })
      .when('/user/signup', {
        templateUrl: '../components/user/signup.html',
        controller: 'UserController'
      })
      .when('/sync', {
        templateUrl: '../components/sync/sync.html',
        controller: 'SyncController'
      })
      .otherwise({
        redirectTo: '/category'
      });
  });
