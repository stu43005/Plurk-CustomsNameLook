var content_raw_preg = /(\[([^\[\]]+)\]|http\:\/\/emos\.plurk\.com\/(\w+)\.(jpg|png|gif|jpeg))/.source,
	content_preg = /\<img\ class\=\"emoticon\_my\"\ src\=\"([^\"]+)\"\ width\=\"(\d+)\"\ height\=\"(\d+)\"(\ \/)?\>/.source,
	customsname, savetimer;

function appendscript(scriptText, args) {
	var args = JSON.stringify(args);
	if (typeof scriptText == 'function')
		scriptText = '(' + scriptText + ')(' + args + ');';

	var script = document.createElement('script');
	script.type = 'text/javascript';
	script.appendChild(document.createTextNode(scriptText));
	document.body.appendChild(script);

	setTimeout(function() {
		script.parentNode.removeChild(script);
	}, 1000);
}

function addcache(id, src, raw) {
	if (!customsname || addcache.ctrl) {
		try {
			customsname = JSON.parse(localStorage["customsname"]);
		} catch (e) {
			customsname = [];
		}
		addcache.ctrl = false;
		if (customsname.length > 500) customsname.splice(0, customsname.length - 500);
	}
	var i;
	do {
		for (i = 0; i < customsname.length && customsname[i].id != id; i++);
		if (i >= customsname.length) customsname.push({
				id: id,
				img: {},
				date: (new Date()).getTime()
			});
	} while (customsname[i].id != id);
	customsname[i]["img"][src] = raw;
	console.debug(parseInt(i), id, src, raw);
	if (savetimer) clearTimeout(savetimer);
	savetimer = setTimeout(function() {
		localStorage["customsname"] = JSON.stringify(customsname);
	}, 1);
}
addcache.ctrl = true;

function getcache(id, src) {
	if (!customsname || addcache.ctrl) {
		try {
			customsname = JSON.parse(localStorage["customsname"]);
		} catch (e) {
			return null;
		}
	}
	for (var i in customsname)
		if (customsname[i].id == id) {
			if (!customsname[i]["img"][src]) return null;
			return customsname[i]["img"][src];
		}
	return null;
}

function showname() {
	var content_raw = this.content_raw,
		content = this.content,
		id = this.id,
		rega = /(\<|\>)/g,
		a = [];
	while (rega.test(this.content) == true)
		a.push(rega.lastIndex - 1);
	a.push(this.content.length);
	for (var i = 0; i < a.length; i++) {
		if (this.content.charAt(a[i]) != '>') {
			var start = (i == 0 ? 0 : a[i - 1] + 1),
				end = a[i] - 1;
			while (this.content.charAt(start) == ' ')
				start++;
			while (this.content.charAt(end) == ' ')
				end--;
			if (start < end) {
				var b = this.content.slice(start, end + 1);
				content_raw = content_raw.replace(b, "");
				content = content.replace(b, "");
			}
		}
	}
	content_raw = content_raw.match(new RegExp(content_raw_preg, "g"));
	content = content.match(new RegExp(content_preg, "g"));
	if (!content || !content_raw) return;
	for (var i in content) content[i] = content[i].match(new RegExp(content_preg, "i"))[1];
	$(this.div).find("img.emoticon_my").each(function() {
		var t = $(this);
		if (t.attr("title") && t.attr("keyword")) return;
		for (var i in content) {
			if (t.attr("src") == content[i]) {
				addcache(id, content[i], content_raw[i]);
				t.attr("title", content_raw[i]).attr("keyword", content_raw[i]);
			}
		}
	});
}

function loadname() {
	var t = $(this);
	if (t.attr("title") && t.attr("keyword")) return;

	var id = t.parents("div.plurk").attr("id");
	if (!id || !(id = id.match(/(\d+)/))) {
		if (t.parents(".bigplurk").length > 0) id = t.parents(".bigplurk").attr("data-pid");
		else if (t.parents(".responses").length > 0) id = t.parents("li").attr("data-rid");
		else if (t.parents(".cbox_plurk_main").length > 0) id = t.parents(".cbox_plurk_main").attr("data-pid");
		else if (t.parents(".cbox_plurk").length > 0) id = t.parents(".cbox_plurk").attr("data-rid");
		else return;
	} else id = id[1];

	var raw = getcache(id, t.attr("src"));
	if (raw != null) {
		t.attr("title", raw).attr("keyword", raw);
		return;
	}

	if ((a = (t.parents("#form_holder").length > 0)) || (b = (t.parents(".responses").length > 0)) || (c = (t.parents(".cbox_plurk").length > 0))) {
		var plurk_id, div_selector;
		if (a) {
			plurk_id = $("div.plurk.plurk_box").attr("id").match(/(\d+)/);
			if (!plurk_id) return;
			plurk_id = plurk_id[1];
			div_selector = "#m%d";
		} else if (b) {
			plurk_id = $(".bigplurk").attr("data-pid");
			div_selector = "#response-%d";
		} else if (c) {
			plurk_id = t.parents(".cbox_plurk").attr("data-pid");
			div_selector = ".cbox_plurk[data-rid=\"%d\"]";
		} else return;

		$.ajax({
			type: "POST",
			url: "/Responses/get2",
			data: {
				"plurk_id": plurk_id,
				"from_response": 0
			},
			success: function(data, textStatus, jqXHR) {
				var response = JSON.parse(data.replace(/new\sDate\(([^\(\)]+)\)/ig, "$1"));
				if (response.responses.length < 1) return;
				addcache.ctrl = true;
				for (var i in response.responses)
					showname.call({
						id: response.responses[i].id,
						div: div_selector.replace(/\%d/ig, response.responses[i].id),
						content_raw: response.responses[i].content_raw,
						content: response.responses[i].content
					});
			},
			error: function() {
				console.debug("Get response failed");
			}
		});
	} else if ((a = (t.parents("div.plurk").length > 0)) || (b = (t.parents(".cbox_plurk_main").length > 0))) {
		var plurk_id = id,
			div_selector;
		if (a) {
			div_selector = "#p%d";
		} else if (b) {
			div_selector = ".cbox_plurk_main[data-pid=\"%d\"]";
		} else return;

		appendscript(function(args) {
			var d = args.id;
			for (var i in TimeLine.plurks) {
				if (TimeLine.plurks[i].id == d) {
					var b = 'content_raw',
						a = AJS.SPAN({
							id: b + d,
							"data-raw": TimeLine.plurks[i].content_raw
						}),
						c = AJS.$(b);
					if (c) {
						AJS.setHTML(c, a);
					} else {
						var s = AJS.SPAN({
							id: b
						}, a);
						AJS.hideElement(s);
						AJS.ACN(AJS.getBody(), s);
					}
				}
			}
		}, {
			id: plurk_id
		});
		setTimeout(function() {
			var content_raw = $("#content_raw" + plurk_id);
			if (content_raw.length > 0) {
				addcache.ctrl = true;
				showname.call({
					id: parseInt(plurk_id),
					div: div_selector.replace(/\%d/ig, plurk_id),
					content_raw: content_raw.attr("data-raw"),
					content: $("#p" + plurk_id + " .plurk_cnt .text_holder").html()
				});
			} else {
				setTimeout(arguments.callee, 100);
			}
		}, 100);
	}
}

$("img.emoticon_my").live("mouseover", loadname);