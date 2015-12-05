'use strict';

angular.module('vocab')
  .directive("showSliderItem", function() {
    return function(scope, element, attrs) {
      scope.$watch('$last',function(v){
        if (v) $("#item-"+scope.currentId).css({"display": "block"}).addClass("word-next").addClass("word-active-item");
      });

    };
  });
