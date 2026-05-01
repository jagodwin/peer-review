$(document).ready(function() {
    let groupMap = {}; // { groupName: [member1, member2, ...] }

    $('#groupSelect, #reviewerSelect, #exportButton').prop('disabled', true);

    $('#csvUpload').on('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function(event) {
            const lines = event.target.result.split(/\r?\n/).filter(line => line.trim() !== '');
            groupMap = {};

            lines.forEach(line => {
                const parts = line.split(',').map(s => s.trim());
                if (parts.length >= 2) {
                    const name = parts[0];
                    const group = parts[1];
                    if (!groupMap[group]) groupMap[group] = [];
                    groupMap[group].push(name);
                }
            });

            const groupSelect = $('#groupSelect');
            groupSelect.empty().append('<option value="">--Select Group--</option>');
            Object.keys(groupMap).forEach(group => {
                groupSelect.append(`<option value="${group}">${group}</option>`);
            });
            groupSelect.prop('disabled', false);
            updateExportState();
        };
        reader.readAsText(file);
    });

    $('#groupSelect').on('change', function() {
        const group = $(this).val();
        const reviewerSelect = $('#reviewerSelect');
        reviewerSelect.empty().append('<option value="">--Select Reviewer--</option>');

        if (group && groupMap[group]) {
            groupMap[group].forEach(name => {
                reviewerSelect.append(`<option value="${name}">${name}</option>`);
            });
            reviewerSelect.prop('disabled', false);
        } else {
            reviewerSelect.prop('disabled', true);
        }

        $('#tableBody').empty();
        $('#ratingTable').hide();
        $('#devTotal').text('0');
        $('#reportTotal').text('0');
        $('#validationMessage').text('');
        updateExportState();
    });

    $('#reviewerSelect').on('change', function() {
        const group = $('#groupSelect').val();
        const reviewer = $(this).val();
        const members = groupMap[group] || [];
        const tableBody = $('#tableBody');

        if (!reviewer) {
            tableBody.empty();
            $('#ratingTable').hide();
            updateTotals();
            return;
        }

        if (members.length > 0 && tableBody.children().length === 0) {
            members.forEach(member => {
                tableBody.append(`
                    <tr>
                        <td>${member}</td>
                        <td><input type="range" min="0" max="100" value="0" class="slider dev-slider" data-member="${member}"></td>
                        <td><span class="dev-value" id="devValue-${member}">0</span></td>
                        <td><input type="range" min="0" max="100" value="0" class="slider report-slider" data-member="${member}"></td>
                        <td><span class="report-value" id="reportValue-${member}">0</span></td>
                        <td><input type="text" placeholder="Dev Comments" name="devComment-${member}" class="comment-box"></td>
                        <td><input type="text" placeholder="Report Comments" name="reportComment-${member}" class="comment-box"></td>
                    </tr>
                `);
            });
        }

        $('#ratingTable').toggle(members.length > 0);
        updateTotals();
    });

    $(document).on('input', '.slider', function() {
        const member = $(this).data('member');
        if ($(this).hasClass('dev-slider')) {
            $(`#devValue-${member}`).text($(this).val());
        } else {
            $(`#reportValue-${member}`).text($(this).val());
        }
        updateTotals();
    });

    $(document).on('input', '.comment-box', function() {
        this.value = this.value.replace(/\r?\n/g, ' ');
        if (this.value.length > 500) this.value = this.value.slice(0, 500);
        updateExportState();
    });

    function updateTotals() {
        let devTotal = 0;
        let reportTotal = 0;
        $('.dev-slider').each(function() { devTotal += parseInt($(this).val()); });
        $('.report-slider').each(function() { reportTotal += parseInt($(this).val()); });
        $('#devTotal').text(devTotal);
        $('#reportTotal').text(reportTotal);

        $('#devTotal').css('color', devTotal === 100 ? 'black' : 'red');
        $('#reportTotal').css('color', reportTotal === 100 ? 'black' : 'red');
        updateExportState();
    }

    $('#exportButton').on('click', function() {
        if (!isSubmissionValid()) {
            updateExportState();
            return;
        }

        const reviewer = $('#reviewerSelect').val();
        const groupName = $('#groupSelect').val();
        let csvRows = [];
        csvRows.push(['Reviewer','Group Name','Member Name','Dev Value','Report Value','Dev Comments','Report Comments'].join(','));

        $('#tableBody tr').each(function() {
            const cols = $(this).find('td');
            const row = [
                reviewer,
                groupName,
                $(cols[0]).text(),
                $(cols[1]).find('input').val(),
                $(cols[3]).find('input').val(),
                $(cols[5]).find('input').val(),
                $(cols[6]).find('input').val()
            ].map(formatCSVField);
            csvRows.push(row.join(','));
        });

        const csvContent = csvRows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'ratings.csv';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });

    function formatCSVField(value) {
        if (value == null) return '';
        let str = String(value);
        str = str.replace(/\r?\n/g, ' ');
        if (/[,"]/.test(str)) {
            return '"' + str.replace(/"/g, '""') + '"';
        }
        return str;
    }

    function isSubmissionValid() {
        const reviewer = $('#reviewerSelect').val();
        const group = $('#groupSelect').val();
        const memberRows = $('#tableBody tr');
        const devTotal = Number($('#devTotal').text());
        const reportTotal = Number($('#reportTotal').text());

        if (!group || !reviewer || memberRows.length === 0) return false;
        if (devTotal !== 100 || reportTotal !== 100) return false;

        let allCommentsPresent = true;
        memberRows.each(function() {
            $(this).find('.comment-box').each(function() {
                if (!$(this).val().trim()) {
                    allCommentsPresent = false;
                    return false;
                }
            });

            if (!allCommentsPresent) return false;
        });

        return allCommentsPresent;
    }

    function updateExportState() {
        const reviewer = $('#reviewerSelect').val();
        const group = $('#groupSelect').val();
        const memberRows = $('#tableBody tr');
        const devTotal = Number($('#devTotal').text());
        const reportTotal = Number($('#reportTotal').text());
        const messageEl = $('#validationMessage');
        const issues = [];

        if (!group) issues.push('Select a group.');
        if (!reviewer) issues.push('Select your name.');
        if (memberRows.length === 0 && group && reviewer) issues.push('Review rows did not load.');
        if (memberRows.length > 0) {
            const hasBlankComments = $('.comment-box').toArray().some(input => !input.value.trim());
            if (hasBlankComments) issues.push('Complete every comment box before exporting.');
        }
        if (devTotal !== 100) issues.push(`Dev total must equal 100. Current total: ${devTotal}.`);
        if (reportTotal !== 100) issues.push(`Report total must equal 100. Current total: ${reportTotal}.`);

        const isValid = issues.length === 0 && isSubmissionValid();
        $('#exportButton').prop('disabled', !isValid);
        messageEl.text(isValid ? 'Submission is ready to export.' : issues.join(' '));
        messageEl.css('color', isValid ? '#1b5e20' : '#b00020');
    }
});
