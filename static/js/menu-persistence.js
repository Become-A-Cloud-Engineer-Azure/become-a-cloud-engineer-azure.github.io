// Menu state persistence for Docdock theme
jQuery(document).ready(function() {
    
    // Function to save menu state
    function saveMenuState() {
        var expandedMenus = [];
        $('#sidebar .dd-item.haschildren').each(function() {
            var $item = $(this);
            var navId = $item.data('nav-id');
            var $ul = $item.children('ul');
            var $icon = $item.find('.category-icon');
            
            if ($ul.is(':visible') && $icon.hasClass('fa-angle-down')) {
                expandedMenus.push(navId);
            }
        });
        sessionStorage.setItem('expandedMenus', JSON.stringify(expandedMenus));
    }
    
    // Function to restore menu state
    function restoreMenuState() {
        var expandedMenus = JSON.parse(sessionStorage.getItem('expandedMenus') || '[]');
        
        expandedMenus.forEach(function(navId) {
            var $item = $('#sidebar .dd-item[data-nav-id="' + navId + '"]');
            if ($item.length) {
                var $ul = $item.children('ul');
                var $icon = $item.find('.category-icon');
                
                // Show the submenu and update the icon
                $ul.show();
                $icon.removeClass('fa-angle-right').addClass('fa-angle-down');
            }
        });
    }
    
    // Function to expand parent menus of current page
    function expandCurrentPath() {
        var currentUrl = window.location.pathname;
        var $currentItem = $('#sidebar .dd-item[data-nav-id*="' + currentUrl + '"]');
        
        if ($currentItem.length) {
            // Find all parent menu items and expand them
            $currentItem.parents('.dd-item.haschildren').each(function() {
                var $item = $(this);
                var $ul = $item.children('ul');
                var $icon = $item.find('.category-icon');
                
                $ul.show();
                $icon.removeClass('fa-angle-right').addClass('fa-angle-down');
            });
        }
    }
    
    // Override the original click handler
    $('#sidebar .category-icon').off('click').on('click', function() {
        var $icon = $(this);
        var $item = $icon.closest('.dd-item');
        var $ul = $item.children('ul');
        
        // Toggle the menu
        $icon.toggleClass("fa-angle-down fa-angle-right");
        $ul.toggle();
        
        // Save the new state
        saveMenuState();
        
        return false;
    });
    
    // Restore menu state on page load
    restoreMenuState();
    
    // Also expand the current path to ensure the active page's menu is visible
    expandCurrentPath();
    
    // Save menu state whenever a menu item is clicked
    $('#sidebar .dd-item a').on('click', function() {
        // Small delay to ensure the click is processed
        setTimeout(saveMenuState, 100);
    });
});
