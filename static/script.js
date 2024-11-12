$(document).ready(function() {
    // Handle Group Selection Change
    $("#groupSelect").change(function() {
        const groupName = $(this).val();
        if (groupName) {
            // Trigger AJAX call if a group is selected
            $.ajax({
                url: '/get_members',
                type: 'POST',
                contentType: 'application/json',
                data: JSON.stringify({ group_name: groupName }),
                success: function(members) {
                    const groupSize = members.length;
                    const sliderMax = (100 / groupSize) * 2;

                    // Populate reviewer dropdown and table
                    let reviewerSelect = $("#reviewerSelect");
                    reviewerSelect.empty().append('<option value="">--Select Reviewer--</option>');
                    members.forEach(member => {
                        reviewerSelect.append(`<option value="${member}">${member}</option>`);
                    });

                    // Show the rating table and populate it with the new slider range
                    let tableBody = $("#tableBody");
                    tableBody.empty();
                    members.forEach(member => {
                        tableBody.append(`
                            <tr>
                                <td>${member}</td>
                                <td><input type="range" min="0" max="${sliderMax}" value="0" class="slider dev-slider" data-member="${member}"></td>
                                <td><span class="dev-value" id="devValue-${member}">0</span></td>
                                <td><input type="range" min="0" max="${sliderMax}" value="0" class="slider report-slider" data-member="${member}"></td>
                                <td><span class="report-value" id="reportValue-${member}">0</span></td>
                                <td><input type="text" placeholder="Dev Comments" name="devComment-${member}"></td>
                                <td><input type="text" placeholder="Report Comments" name="reportComment-${member}"></td>
                            </tr>
                        `);
                    });

                    // Show the table and reset totals
                    $("#ratingTable").show();
                    updateSums();  // Reset the totals to reflect the initial state
                }
            });
        }
    });


    // Update displayed value when sliders are changed
    $(document).on('input', '.dev-slider', function() {
        const member = $(this).data("member");
        $(`#devValue-${member}`).text($(this).val());
    });
    $(document).on('input', '.report-slider', function() {
        const member = $(this).data("member");
        $(`#reportValue-${member}`).text($(this).val());
    });

    // Function to export table data as CSV with reviewer name included
    function exportTableToCSV(filename) {
        let csv = [];
        let reviewer = $("#reviewerSelect").val();  // Get selected reviewer
        let rows = document.querySelectorAll("#ratingTable tr");

        // Add header row with "Reviewer" column
        let headerRow = ["Reviewer"];
        rows[0].querySelectorAll("th").forEach((th, index) => {
            // Skip "Dev" and "Report" columns if they are empty
            if (index !== 1 && index !== 3) {  // Skipping 2nd (Dev) and 4th (Report) columns
                headerRow.push(th.innerText);
            }
        });
        csv.push(headerRow.join(","));

        // Loop through each row in the table to get data
        for (let i = 1; i < rows.length; i++) {
            let rowData = [reviewer];  // Start each row with the reviewer's name
            let cells = rows[i].querySelectorAll("td");

            // Add each cell's text to the row data, skipping empty Dev and Report slider columns
            cells.forEach((cell, index) => {
                if (index === 1 || index === 3) {
                    // Skip the "Dev" and "Report" slider columns (we will handle their values separately)
                    return;
                }

                // TODO - modify the values to account for commas and returns that mess up csv format
                // If it's the "Dev Comments" or "Report Comments" columns, get the input field value
                if (index === 5) {  // "Dev Comments" column (6th column, index 5)
                    rowData.push('"' + cell.querySelector("input").value + '"');
                } else if (index === 6) {  // "Report Comments" column (7th column, index 6)
                    rowData.push('"' +cell.querySelector("input").value+ '"');
                } else {
                    // For other columns, just add the innerText (Dev/Report slider values, member names)
                    rowData.push(cell.innerText);
                }
            });

            csv.push(rowData.join(","));
        }

        // Create a Blob from the CSV string
        let csvFile = new Blob([csv.join("\n")], { type: "text/csv" });

        // Create a link to download the Blob as a file
        let downloadLink = document.createElement("a");
        downloadLink.href = URL.createObjectURL(csvFile);
        downloadLink.download = filename;

        // Trigger the download
        downloadLink.click();
    }

    // Attach event listener to the export button
    document.getElementById("exportButton").addEventListener("click", function () {
        if($("#reviewerSelect").val())
            exportTableToCSV($("#reviewerSelect").val() + "-peer_review.csv");
        else{
            alert('Reviewer must be selected. Please select your name from the drop down before exporting.')
        }
    });

    // Function to update the totals for Dev and Report columns and change color based on the sum
    function updateSums() {
        let devTotal = 0;
        let reportTotal = 0;

        // Loop through each row and add up the Dev and Report values
        $("#ratingTable tbody tr").each(function () {
            let devValue = parseFloat($(this).find(".dev-slider").val()) || 0;
            let reportValue = parseFloat($(this).find(".report-slider").val()) || 0;

            devTotal += devValue;
            reportTotal += reportValue;
        });

        // Update the total display for Dev and Report columns
        $("#devTotal").text(devTotal);
        $("#reportTotal").text(reportTotal);
        let dev_valid = false
        let report_valid = false
        if (devTotal < 100 || devTotal > 100){
            $("#devTotal").css("color", "red");
            $("#exportButton").prop("disabled", true);
        }
        else {
            $("#devTotal").css("color", "green");
            dev_valid = true
        }

         if (reportTotal < 100 || reportTotal > 100){
            $("#reportTotal").css("color", "red");
            $("#exportButton").prop("disabled", true)
         }
         else {
             $("#reportTotal").css("color", "green");
             report_valid = true
         }

         if (dev_valid && report_valid){
            $("#exportButton").prop("disabled", false);
         }

    }


    // Update displayed value and sums when sliders are changed
    $(document).on('input', '.dev-slider', function() {
        const member = $(this).data("member");
        $(`#devValue-${member}`).text($(this).val());
        updateSums();  // Recalculate sums
    });

    $(document).on('input', '.report-slider', function() {
        const member = $(this).data("member");
        $(`#reportValue-${member}`).text($(this).val());
        updateSums();  // Recalculate sums
    });

});
