'use strict';

angular.module('vocab')
  .directive("checkCategoryName", function(DatabaseService, $q) {
    return {
      restrict: "A",

      require: "ngModel",

      link: function(scope, element, attributes, ngModel) {
        ngModel.$asyncValidators.checkCategoryName = function(modelValue) {
          var q = {
            "query": "SELECT * FROM category WHERE name = ?",
            attr: [""+modelValue+""]
          }
         return DatabaseService.find(q).then(function(res){
           if(res.rows.length > 0)
              return $q.reject(res);
           else
              return true;
          });
        }
      }
    };
});
