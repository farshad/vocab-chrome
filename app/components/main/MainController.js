'use strict';

angular.module('vocab')
  .controller('MainController', function ($rootScope, $scope, DatabaseService) {

    //init database
    $scope.db = DatabaseService.connect();

    //show, hide search text box
    $scope.toggleSearchBtn = function(){
        $('#search-btn').toggle();
        $('#search-btn').focus();
    }

    //hide sub-search area
    $(document).on('click', function (e) {
      if( e.target.id != 'sub-search') {
        $("#sub-search").hide();
        $('#search-btn').val('');
      }
    });

    //on change search
    $scope.search = function () {
      if($scope.search.key.length == 0)
        $("#sub-search").hide();
      if($scope.search.key.length > 1){
        var q = {
          "query": "SELECT * FROM word WHERE name LIKE ?",
          attr: [""+$scope.search.key+"%"]
        }
        DatabaseService.find(q).then(function(res){
          if(res.rows.length > 0){
            $('#sub-search').show();
            $('#sub-search-result').html('');
            var i, row, elem,  count = res.rows.length;
            for (i = 0; i < count; i++)
            {
              row = res.rows.item(i);
              elem = "<li><a href='#word/slider/"+row.category_id+"/"+row.id+"'>"+row.name+"</a></li>";
              $('#sub-search-result').append(elem);
            }
          }
          else{
            $('#sub-search-result').html('');
            $('#sub-search-result').append('<li>Not Found!</li>');
          }
        });
      }
    }

  });