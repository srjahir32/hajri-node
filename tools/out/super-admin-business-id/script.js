
        $(document).ready(function () {
            // Move modal to body to avoid z-index and backdrop clipping issues
            $('#extendTrialModal').appendTo('body');
            $('#toggleStatusModal').appendTo('body');
            // Tab Toggling
            $('.tab-btn').click(function () {
                var tabId = $(this).data('tab');
                // Active button class toggle
                $('.tab-btn').removeClass('active');
                $(this).addClass('active');
                // Active pane class toggle
                $('.tab-pane').removeClass('active');
                $('#' + tabId).addClass('active');
            });
            // Initialize DataTable for Employees
            var employeeTable = $('#employeeTable').DataTable({
                pageLength: 10,
                lengthChange: false,
                searching: true,
                info: true,
                dom: '<"top">rt<"bottom"ip><"clear">',
                language: {
                    emptyTable: "No employees found in this business.",
                    zeroRecords: "No matching employees found."
                }
            });
            // Employee Filtering
            $('#departmentFilter').on('change', function () {
                var val = $(this).val();
                if (val === "") {
                    employeeTable.column(2).search('').draw();
                } else if (val === "-") {
                    employeeTable.column(2).search('^-$', true, false).draw();
                } else {
                    var text = $(this).find("option:selected").text();
                    employeeTable.column(2).search('^' + $.fn.dataTable.util.escapeRegex(text) + '$', true, false).draw();
                }
            });
            $('#shiftFilter').on('change', function () {
                var val = $(this).val();
                if (val === "") {
                    employeeTable.column(3).search('').draw();
                } else if (val === "no shift") {
                    employeeTable.column(3).search('^No Shift$', true, false).draw();
                } else {
                    var text = $(this).find("option:selected").text();
                    employeeTable.column(3).search('^' + $.fn.dataTable.util.escapeRegex(text) + '$', true, false).draw();
                }
            });
            $('#statusFilter').on('change', function () {
                var val = $(this).val();
                if (val === "") {
                    employeeTable.column(5).search('').draw();
                } else {
                    var text = $(this).find("option:selected").text();
                    employeeTable.column(5).search('^' + $.fn.dataTable.util.escapeRegex(text) + '$', true, false).draw();
                }
            });
            $('#employeeSearch').on('keyup', function () {
                employeeTable.search($(this).val()).draw();
            });
            // Initialize DataTable for Admin Users
            var adminUsersTable = $('#adminUsersTable').DataTable({
                pageLength: 10,
                lengthChange: false,
                searching: true,
                info: true,
                dom: '<"top">rt<"bottom"ip><"clear">',
                language: {
                    emptyTable: "No admin users found for this business.",
                    zeroRecords: "No matching admin users found."
                }
            });
            $('#adminUserSearch').on('keyup', function () {
                adminUsersTable.search($(this).val()).draw();
            });
            $('#adminRoleFilter').on('change', function () {
                var val = $(this).val();
                if (val === "") {
                    adminUsersTable.column(3).search('').draw();
                } else if (val === "No Role") {
                    adminUsersTable.column(3).search('^No Role$', true, false).draw();
                } else {
                    var text = $(this).find("option:selected").text();
                    adminUsersTable.column(3).search('^' + $.fn.dataTable.util.escapeRegex(text) + '$', true, false).draw();
                }
            });
        });
    

/* ---- raw @section(scripts) remainder ---- */

    
