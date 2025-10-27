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
        $('#exportButton').prop('disabled', true);
    });

    $('#reviewerSelect').on('change', function() {
        const group = $('#groupSelect').val();
        const members = groupMap[group]
        const tableBody = $('#tableBody');
        tableBody.empty();

        if (members.length > 0) {
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

            $('#ratingTable').show();
            $('#exportButton').prop('disabled', false);
        } else {
            $('#ratingTable').hide();
            $('#exportButton').prop('disabled', true);
        }

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
    }

    $('#exportButton').on('click', function() {
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
});
