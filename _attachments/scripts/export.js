$(function () {
    var loc, exportUri;
    loc = window.location;
    exportUri = loc.protocol + "//" + loc.host + "/" + loc.pathname.split("/")[1] + "/_design/sessel/_rewrite/export.";
    $(".export-btn").click(function (evt) {
        var format, form;
        format = evt.target.dataset.exportFormat;
        form = $("#export-form");
        form.attr("action", exportUri + format);
        form.submit();
        return false;
    });
});
