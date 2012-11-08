$(function () {
    var baseUri;
    baseUri = window.location.protocol + "//" + window.location.host + "/" + window.location.pathname.split("/")[1];
    $("#base-uri").val(baseUri + "/_design/sessel/_rewrite/");
    $(".export-btn").click(function (evt) {
        var format, form;
        format = evt.target.dataset.exportFormat;
        form = $("#export-form");
        form.attr("action", baseUri + "/_design/sessel/_rewrite/export." + format);
        form.submit();
        return false;
    });
});
