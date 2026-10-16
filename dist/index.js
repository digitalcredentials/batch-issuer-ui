import { Fragment as e, useEffect as t, useMemo as n, useRef as r, useState as i } from "react";
import { Fragment as a, jsx as o, jsxs as s } from "react/jsx-runtime";
import c from "papaparse";
//#region src/lib/errors.ts
var l = {
	"load-batches": "The batches could not be loaded.",
	"load-templates": "The templates could not be loaded.",
	"open-batch": "The batch could not be opened.",
	save: "The batch could not be saved.",
	notify: "The recipients could not be notified.",
	resend: "The notification could not be resent.",
	revoke: "The credential could not be revoked.",
	delete: "The batch could not be deleted."
}, u = "https://github.com/digitalcredentials/was-server-aws#coupon-required", d = "This account can't create batch storage right now. Contact whoever runs this deployment.", f = "Your session has ended. Sign in again, then try once more.", p = class extends Error {
	constructor(e) {
		super("The batch space could not be created.", { cause: e }), this.name = "SpaceCreationError";
	}
};
function m(e) {
	if (typeof e != "object" || !e) return {};
	let { status: t, type: n, data: r, message: i } = e, a = typeof r == "object" && r ? r : void 0, o = typeof n == "string" ? n : typeof a?.type == "string" ? a.type : void 0;
	return {
		status: typeof t == "number" ? t : void 0,
		type: o,
		message: typeof i == "string" ? i : void 0
	};
}
function h(e) {
	let { status: t, message: n } = m(e);
	return t === 401 || n === "UNAUTHORIZED" || n === "Not logged in.";
}
function g(e, t) {
	console.error(`Batch issuer: ${e} failed`, t);
	let n = t instanceof p ? t.cause : t;
	if (h(n)) return f;
	if (t instanceof p) {
		let { status: e, type: t } = m(n);
		if (e === 403 || t === u) return d;
	}
	return `${l[e]} Please try again.`;
}
//#endregion
//#region src/lib/batches.ts
var _ = "batch", v = "batch.json";
function y(e) {
	let t = e.match(/^(.+)\/space\/([^/?#]+)$/);
	return t ? {
		serverUrl: t[1],
		spaceId: t[2]
	} : null;
}
async function b(e) {
	let t = await e.getSession();
	if (!t) throw e.onUnauthorized(), Error("Not logged in.");
	return t.client;
}
function x(e, t) {
	let n = y(t);
	if (!n) throw Error(`Not a space URL: ${t}`);
	return e.space(n.spaceId).collection(_);
}
async function S(e, t) {
	let n = await b(e), r = t.spaceUrl;
	if (!r) {
		try {
			r = await e.spaces.create("batch", t.name);
		} catch (e) {
			throw new p(e);
		}
		let i = y(r);
		if (!i) throw Error(`Not a space URL: ${r}`);
		await n.space(i.spaceId).createCollection({
			id: _,
			name: "Batch"
		});
	}
	let i = {
		...t,
		spaceUrl: r,
		updatedAt: (/* @__PURE__ */ new Date()).toISOString()
	}, a = JSON.parse(JSON.stringify(i));
	return await x(n, r).put(v, a), i;
}
async function C(e, t) {
	let n = await x(await b(e), t).get(v);
	return n && !(n instanceof Blob) ? n : null;
}
async function w(e, t) {
	let n = await b(e), r = y(t);
	if (!r) return null;
	let i = await n.space(r.spaceId).collection("logs").get("log.json").catch(() => null);
	if (!i || i instanceof Blob) return null;
	let a = i;
	return {
		entries: a.entries ?? [],
		credentials: a.credentials ?? {}
	};
}
function T(e) {
	return !!e?.entries.some(({ type: e }) => e === "notification-triggered");
}
async function E(e, t, n, r) {
	await e.revokeStatus(r);
	let i = await b(e), a = y(t);
	if (!a) throw Error(`Not a space URL: ${t}`);
	let o = i.space(a.spaceId).collection("logs"), s = await o.get("log.json").catch(() => null), c = s && !(s instanceof Blob) ? s : {
		entries: [],
		credentials: {}
	};
	c.credentials ??= {}, c.credentials[n] = {
		...c.credentials[n],
		revokedAt: (/* @__PURE__ */ new Date()).toISOString()
	}, await o.put("log.json", JSON.parse(JSON.stringify(c)));
}
async function ee(e, t) {
	t.spaceUrl && await e.spaces.remove(t.spaceUrl);
}
async function D(e) {
	let t = await b(e), n = (await e.spaces.list()).filter(({ type: e }) => e === "batch");
	return (await Promise.all(n.map(async (e) => {
		try {
			let n = await x(t, e.url).get(v);
			if (n && !(n instanceof Blob)) return {
				...n,
				spaceUrl: e.url
			};
		} catch {}
		return {
			id: e.url,
			spaceUrl: e.url,
			name: e.name ?? "",
			description: "",
			issuer: { name: "" },
			achievementId: "",
			templateId: "",
			columns: [],
			rows: [],
			createdAt: e.createdAt ?? "",
			updatedAt: e.createdAt ?? ""
		};
	}))).sort((e, t) => t.updatedAt.localeCompare(e.updatedAt));
}
//#endregion
//#region src/lib/types.ts
function O() {
	let e = (/* @__PURE__ */ new Date()).toISOString();
	return {
		id: crypto.randomUUID(),
		spaceUrl: "",
		name: "",
		description: "",
		issuer: { name: "" },
		achievementId: `urn:uuid:${crypto.randomUUID()}`,
		templateId: "",
		columns: [],
		rows: [],
		createdAt: e,
		updatedAt: e
	};
}
//#endregion
//#region src/components/BatchListPage.tsx
function k({ adapter: e, onEdit: n, openError: r }) {
	let [c, l] = i(null), [u, d] = i(null);
	return t(() => {
		D(e).then(l, (e) => {
			d(g("load-batches", e)), l([]);
		});
	}, [e]), /* @__PURE__ */ s("div", { children: [
		/* @__PURE__ */ s("div", {
			className: "mb-6 flex items-center justify-between",
			children: [/* @__PURE__ */ o("h2", {
				className: "text-xl font-semibold",
				children: "Credential batches"
			}), /* @__PURE__ */ o("button", {
				type: "button",
				onClick: () => n(O()),
				className: "rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700",
				children: "New batch"
			})]
		}),
		r && r !== u && /* @__PURE__ */ o("p", {
			className: "mb-4 text-sm text-red-600",
			children: r
		}),
		u && /* @__PURE__ */ o("p", {
			className: "mb-4 text-sm text-red-600",
			children: u
		}),
		c === null ? /* @__PURE__ */ o("p", {
			className: "text-sm text-slate-500",
			children: "Loading batches…"
		}) : c.length === 0 ? /* @__PURE__ */ o("p", {
			className: "text-sm text-slate-500",
			children: "No batches yet. Create one to issue credentials to a list of recipients. Each batch gets its own storage space."
		}) : /* @__PURE__ */ o("ul", {
			className: "divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white",
			children: c.map((e) => /* @__PURE__ */ s("li", {
				className: "flex items-center gap-4 px-5 py-4",
				children: [/* @__PURE__ */ s("div", {
					className: "min-w-0 flex-1",
					children: [/* @__PURE__ */ o("p", {
						className: "truncate font-medium text-slate-900",
						children: e.name || /* @__PURE__ */ o("span", {
							className: "italic text-slate-400",
							children: "Untitled batch"
						})
					}), /* @__PURE__ */ s("p", {
						className: "truncate text-sm text-slate-500",
						children: [
							e.rows.length,
							" recipient",
							e.rows.length === 1 ? "" : "s",
							e.templateId && /* @__PURE__ */ s(a, { children: [" · template: ", e.templateId] }),
							e.issuer.name && /* @__PURE__ */ s(a, { children: [" · issuer: ", e.issuer.name] })
						]
					})]
				}), /* @__PURE__ */ o("button", {
					type: "button",
					onClick: () => n(e),
					className: "rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50",
					children: "Open"
				})]
			}, e.id))
		})
	] });
}
//#endregion
//#region src/lib/csv.ts
function A(e) {
	return new Promise((t, n) => {
		c.parse(e, {
			header: !0,
			skipEmptyLines: "greedy",
			transformHeader: (e) => e.trim(),
			complete: ({ data: e, meta: r, errors: i }) => {
				let a = i.filter(({ code: e }) => e !== "TooFewFields" && e !== "TooManyFields");
				if (a.length) {
					n(/* @__PURE__ */ Error(`CSV parse error: ${a[0].message}`));
					return;
				}
				let o = (r.fields ?? []).filter((e) => e !== "");
				if (!o.length) {
					n(/* @__PURE__ */ Error("CSV has no header row."));
					return;
				}
				t({
					columns: o,
					rows: e.map((e) => Object.fromEntries(o.map((t) => [t, e[t] ?? ""])))
				});
			},
			error: (e) => n(e)
		});
	});
}
//#endregion
//#region src/lib/templates.ts
async function j(e) {
	let t = e.replace(/\/+$/, ""), n = await fetch(`${t}/templates`);
	if (!n.ok) throw Error(`Failed to load templates: ${n.status}`);
	let { templates: r } = await n.json();
	return r;
}
//#endregion
//#region src/components/RowGrid.tsx
function M({ columns: e, rows: t, onChange: n, readOnly: r = !1 }) {
	function i() {
		return Object.fromEntries(e.map((e) => [e, ""]));
	}
	function c(e, r, i) {
		n(t.map((t, n) => n === e ? {
			...t,
			[r]: i
		} : t));
	}
	function l(e) {
		n(t.filter((t, n) => n !== e));
	}
	function u(e) {
		let r = [...t];
		r.splice(e + 1, 0, i()), n(r);
	}
	return /* @__PURE__ */ s("div", {
		className: "overflow-x-auto rounded-xl border border-slate-200 bg-white",
		children: [/* @__PURE__ */ s("table", {
			className: "w-full min-w-max border-collapse text-sm",
			children: [/* @__PURE__ */ o("thead", { children: /* @__PURE__ */ s("tr", {
				className: "border-b border-slate-200 bg-slate-50 text-left",
				children: [
					/* @__PURE__ */ o("th", {
						className: "w-10 px-2 py-2 font-medium text-slate-400",
						children: "#"
					}),
					e.map((e) => /* @__PURE__ */ o("th", {
						className: "px-3 py-2 font-medium text-slate-700",
						children: e
					}, e)),
					/* @__PURE__ */ o("th", { className: "w-24 px-2 py-2" })
				]
			}) }), /* @__PURE__ */ o("tbody", { children: t.map((t, n) => /* @__PURE__ */ s("tr", {
				className: "border-b border-slate-100 last:border-b-0",
				children: [
					/* @__PURE__ */ o("td", {
						className: "px-2 py-1 text-slate-400",
						children: n + 1
					}),
					e.map((e) => /* @__PURE__ */ o("td", {
						className: "px-1 py-1",
						children: /* @__PURE__ */ o("input", {
							value: t[e] ?? "",
							onChange: (t) => c(n, e, t.target.value),
							disabled: r,
							className: "w-full min-w-32 rounded border border-transparent px-2 py-1 hover:border-slate-200 focus:border-indigo-500 focus:outline-none disabled:text-slate-500"
						})
					}, e)),
					/* @__PURE__ */ o("td", {
						className: "whitespace-nowrap px-2 py-1 text-right",
						children: !r && /* @__PURE__ */ s(a, { children: [/* @__PURE__ */ o("button", {
							type: "button",
							title: "Insert row below",
							onClick: () => u(n),
							className: "rounded px-2 py-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700",
							children: "+"
						}), /* @__PURE__ */ o("button", {
							type: "button",
							title: "Delete row",
							onClick: () => l(n),
							className: "rounded px-2 py-1 text-slate-400 hover:bg-red-50 hover:text-red-600",
							children: "✕"
						})] })
					})
				]
			}, n)) })]
		}), !r && /* @__PURE__ */ o("div", {
			className: "border-t border-slate-200 px-3 py-2",
			children: /* @__PURE__ */ o("button", {
				type: "button",
				onClick: () => n([...t, i()]),
				className: "text-sm text-indigo-600 hover:text-indigo-800",
				children: "+ Add row"
			})
		})]
	});
}
//#endregion
//#region src/components/BatchEditor.tsx
var N = "w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none";
function P({ adapter: a, initialBatch: c, onDone: l }) {
	let [u, d] = i(c), [f, p] = i(null), [m, h] = i(null), [_, v] = i(null), [y, b] = i(!1), [x, C] = i(!1), [D, O] = i(!1), [k, P] = i(null), [F, I] = i(null), [L, R] = i(null), [z, B] = i(!1), [V, H] = i(!1), [U, W] = i(null), [te, ne] = i(/* @__PURE__ */ new Set());
	function G(e) {
		ne((t) => {
			let n = new Set(t);
			return n.has(e) ? n.delete(e) : n.add(e), n;
		});
	}
	async function re(e, t) {
		let n = u.rows[e];
		if (n && confirm(`Resend the notification email to ${n.recipientEmail || "this recipient"}?`)) {
			W(t), h(null);
			try {
				let { recipientRows: t, failures: r } = await a.notifyRecipients({
					...u,
					rows: [n]
				});
				if (r.length) {
					h(g("resend", r[0].reason));
					return;
				}
				let i = Object.keys(t ?? {})[0];
				if (i) {
					let t = u.rows.map((t, n) => n === e ? {
						...t,
						credId: t.credId ? `${t.credId},${i}` : i
					} : t), n = await S(a, {
						...u,
						rows: t
					});
					d(n);
				}
				u.spaceUrl && await J(u.spaceUrl);
			} catch (e) {
				h(g("resend", e));
			} finally {
				W(null);
			}
		}
	}
	let K = r(null), q = T(F);
	t(() => {
		j(a.templatesApiBase).then(p, (e) => {
			p([]), h(g("load-templates", e));
		});
	}, [a]);
	async function J(e) {
		try {
			I(await w(a, e));
		} catch (e) {
			console.error("Batch issuer: loading the activity log failed", e);
		}
	}
	t(() => {
		c.spaceUrl && J(c.spaceUrl);
	}, [c.spaceUrl]);
	async function Y(e, t) {
		if (confirm("Revoke this credential? Verifiers will see it as revoked. This cannot be undone here.")) {
			R(e), h(null);
			try {
				await E(a, u.spaceUrl, e, t), await J(u.spaceUrl);
			} catch (e) {
				h(g("revoke", e));
			} finally {
				R(null);
			}
		}
	}
	let X = n(() => f?.find(({ id: e }) => e === u.templateId) ?? null, [f, u.templateId]);
	function Z(e) {
		d((t) => ({
			...t,
			...e
		})), P(null);
	}
	function Q(e) {
		d((t) => ({
			...t,
			issuer: {
				...t.issuer,
				...e
			}
		})), P(null);
	}
	async function ie(e) {
		h(null);
		try {
			let { columns: t, rows: n } = await A(e);
			if (u.rows.length && !confirm(`Replace the current ${u.rows.length} row(s) with ${n.length} row(s) from "${e.name}"?`)) return;
			Z({
				columns: t,
				rows: n
			});
		} catch (e) {
			h(e instanceof Error ? e.message : "Failed to parse CSV.");
		} finally {
			K.current && (K.current.value = "");
		}
	}
	async function ae() {
		if (!u.name.trim()) {
			h("A batch needs a name before it can be saved.");
			return;
		}
		b(!0), h(null);
		try {
			let e = await S(a, u);
			d(e), P(e.updatedAt);
		} catch (e) {
			h(g("save", e));
		} finally {
			b(!1);
		}
	}
	async function oe() {
		if (confirm("We're about to email all recipients in your batch to let them know they can now collect their credential. Okay to send the emails?")) {
			C(!0), h(null), v(null);
			try {
				let { sent: e, failures: t, recipientRows: n } = await a.notifyRecipients(u);
				if (v(`Emailed ${e} recipient${e === 1 ? "" : "s"}.`), t.length && (console.error("Batch issuer: notify failed for some rows", t), h(`${t.length} row${t.length === 1 ? "" : "s"} could not be notified (` + t.map(({ row: e }) => `row ${e + 1}`).join(", ") + "). Check those rows' email addresses. Resending notifications emails every recipient again.")), n && Object.keys(n).length) {
					let e = new Map(Object.entries(n).map(([e, t]) => [t, e])), t = u.rows.map((t, n) => {
						let r = e.get(n);
						return r ? {
							...t,
							credId: t.credId ? `${t.credId},${r}` : r
						} : t;
					});
					try {
						let e = await S(a, {
							...u,
							rows: t
						});
						d(e);
					} catch (e) {
						g("save", e), h("The recipients were emailed, but the batch could not be updated to record it. Check the activity log before resending.");
					}
				}
			} catch (e) {
				h(g("notify", e));
			} finally {
				C(!1), u.spaceUrl && J(u.spaceUrl);
			}
		}
	}
	async function se() {
		if (confirm(`Delete batch "${u.name || u.id}"? This deletes the batch's whole storage space and cannot be undone.`)) {
			O(!0), h(null);
			try {
				await ee(a, u), l();
			} catch (e) {
				h(g("delete", e)), O(!1);
			}
		}
	}
	let $ = n(() => !X || !u.columns.length ? [] : X.fields.filter(({ required: e, name: t }) => e && !u.columns.includes(t)).map(({ name: e }) => e), [X, u.columns]);
	return /* @__PURE__ */ s("div", { children: [
		/* @__PURE__ */ s("div", {
			className: "mb-6 flex items-center justify-between",
			children: [/* @__PURE__ */ o("h2", {
				className: "text-xl font-semibold",
				children: u.name.trim() ? u.name : "New batch"
			}), /* @__PURE__ */ s("div", {
				className: "flex items-center gap-3",
				children: [
					k && /* @__PURE__ */ o("span", {
						className: "text-sm text-green-700",
						children: "Saved"
					}),
					/* @__PURE__ */ o("button", {
						type: "button",
						onClick: l,
						className: "rounded-md border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50",
						children: "Back to batches"
					}),
					u.spaceUrl && /* @__PURE__ */ o("button", {
						type: "button",
						onClick: se,
						disabled: D,
						className: "rounded-md border border-red-200 px-4 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50",
						children: D ? "Deleting…" : "Delete"
					}),
					/* @__PURE__ */ o("button", {
						type: "button",
						onClick: oe,
						disabled: x || !u.spaceUrl || u.rows.length === 0,
						title: u.spaceUrl ? u.rows.length === 0 ? "Upload recipients first" : "Email every recipient a collection link" : "Save the batch first",
						className: "rounded-md border border-indigo-300 px-4 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-50 disabled:opacity-50",
						children: x ? "Notifying…" : q ? "Resend Notifications" : "Notify recipients"
					}),
					!q && /* @__PURE__ */ o("button", {
						type: "button",
						onClick: ae,
						disabled: y,
						className: "rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50",
						children: y ? "Saving…" : "Save batch"
					})
				]
			})]
		}),
		q && /* @__PURE__ */ o("p", {
			className: "mb-4 rounded-md bg-amber-50 px-4 py-2 text-sm font-medium text-amber-800",
			children: "The recipients have been notified and so the batch details can no longer be changed."
		}),
		m && /* @__PURE__ */ o("p", {
			className: "mb-4 rounded-md bg-red-50 px-4 py-2 text-sm text-red-700",
			children: m
		}),
		_ && /* @__PURE__ */ o("p", {
			className: "mb-4 rounded-md bg-green-50 px-4 py-2 text-sm text-green-800",
			children: _
		}),
		/* @__PURE__ */ s("section", {
			className: "mb-8 rounded-xl border border-slate-200 bg-white",
			children: [q && /* @__PURE__ */ s("button", {
				type: "button",
				onClick: () => B((e) => !e),
				"aria-expanded": z,
				className: "flex w-full items-center justify-between px-6 py-4 text-left",
				children: [/* @__PURE__ */ o("span", {
					className: "text-base font-semibold",
					children: "Batch details"
				}), /* @__PURE__ */ o("span", {
					"aria-hidden": "true",
					className: "text-slate-400",
					children: z ? "▾" : "▸"
				})]
			}), /* @__PURE__ */ s("div", {
				className: `grid gap-4 p-6 sm:grid-cols-2 ${q ? `border-t border-slate-200 ${z ? "" : "hidden"}` : ""}`,
				children: [
					/* @__PURE__ */ s("label", {
						className: "block",
						children: [/* @__PURE__ */ o("span", {
							className: "mb-1 block text-sm font-medium text-slate-700",
							children: "Batch name"
						}), /* @__PURE__ */ o("input", {
							value: u.name,
							onChange: (e) => Z({ name: e.target.value }),
							disabled: q,
							placeholder: "VC Summit 2026 attendance",
							className: N
						})]
					}),
					/* @__PURE__ */ s("label", {
						className: "block",
						children: [/* @__PURE__ */ o("span", {
							className: "mb-1 block text-sm font-medium text-slate-700",
							children: "Issuer name"
						}), /* @__PURE__ */ o("input", {
							value: u.issuer.name,
							onChange: (e) => Q({ name: e.target.value }),
							disabled: q,
							placeholder: "Verifiable Credentials Summit",
							className: N
						})]
					}),
					/* @__PURE__ */ s("label", {
						className: "block sm:col-span-2",
						children: [/* @__PURE__ */ o("span", {
							className: "mb-1 block text-sm font-medium text-slate-700",
							children: "Batch description"
						}), /* @__PURE__ */ o("textarea", {
							value: u.description,
							onChange: (e) => Z({ description: e.target.value }),
							disabled: q,
							rows: 2,
							placeholder: "Attendance credentials for everyone who attended the 2026 summit.",
							className: N
						})]
					}),
					/* @__PURE__ */ s("label", {
						className: "block",
						children: [/* @__PURE__ */ s("span", {
							className: "mb-1 block text-sm font-medium text-slate-700",
							children: ["Issuer URL ", /* @__PURE__ */ o("span", {
								className: "font-normal text-slate-400",
								children: "(optional)"
							})]
						}), /* @__PURE__ */ o("input", {
							type: "url",
							value: u.issuer.url ?? "",
							onChange: (e) => Q({ url: e.target.value || void 0 }),
							disabled: q,
							placeholder: "https://summit.example.org",
							className: N
						})]
					}),
					/* @__PURE__ */ s("label", {
						className: "block",
						children: [/* @__PURE__ */ s("span", {
							className: "mb-1 block text-sm font-medium text-slate-700",
							children: ["Issuer logo URL ", /* @__PURE__ */ o("span", {
								className: "font-normal text-slate-400",
								children: "(optional)"
							})]
						}), /* @__PURE__ */ s("div", {
							className: "flex items-center gap-3",
							children: [/* @__PURE__ */ o("input", {
								type: "url",
								value: u.issuer.image ?? "",
								onChange: (e) => Q({ image: e.target.value || void 0 }),
								disabled: q,
								placeholder: "https://summit.example.org/logo.png",
								className: N
							}), u.issuer.image && /* @__PURE__ */ o("img", {
								src: u.issuer.image,
								alt: "Issuer logo preview",
								className: "h-10 w-10 shrink-0 rounded-md border border-slate-200 object-contain"
							})]
						})]
					}),
					/* @__PURE__ */ s("label", {
						className: "block",
						children: [/* @__PURE__ */ s("span", {
							className: "mb-1 block text-sm font-medium text-slate-700",
							children: ["Credential image URL ", /* @__PURE__ */ o("span", {
								className: "font-normal text-slate-400",
								children: "(optional)"
							})]
						}), /* @__PURE__ */ s("div", {
							className: "flex items-center gap-3",
							children: [/* @__PURE__ */ o("input", {
								type: "url",
								value: u.image ?? "",
								onChange: (e) => Z({ image: e.target.value || void 0 }),
								disabled: q,
								placeholder: "https://summit.example.org/badge.png",
								className: N
							}), u.image && /* @__PURE__ */ o("img", {
								src: u.image,
								alt: "Credential image preview",
								className: "h-10 w-10 shrink-0 rounded-md border border-slate-200 object-contain"
							})]
						})]
					}),
					/* @__PURE__ */ s("label", {
						className: "block",
						children: [
							/* @__PURE__ */ o("span", {
								className: "mb-1 block text-sm font-medium text-slate-700",
								children: "Template"
							}),
							/* @__PURE__ */ s("select", {
								value: u.templateId,
								onChange: (e) => Z({ templateId: e.target.value }),
								disabled: q,
								className: N,
								children: [/* @__PURE__ */ o("option", {
									value: "",
									children: f === null ? "Loading templates…" : "Select a template…"
								}), f?.map(({ id: e, name: t }) => /* @__PURE__ */ o("option", {
									value: e,
									children: t
								}, e))]
							}),
							X && /* @__PURE__ */ s("span", {
								className: "mt-1 block text-xs text-slate-500",
								children: [
									X.description,
									" Fields:",
									" ",
									X.fields.map(({ name: e, required: t }) => t ? `${e}*` : e).join(", ")
								]
							})
						]
					}),
					/* @__PURE__ */ s("label", {
						className: "block",
						children: [
							/* @__PURE__ */ o("span", {
								className: "mb-1 block text-sm font-medium text-slate-700",
								children: "CSV"
							}),
							/* @__PURE__ */ o("input", {
								ref: K,
								type: "file",
								accept: ".csv,text/csv",
								disabled: q,
								onChange: (e) => {
									let t = e.target.files?.[0];
									t && ie(t);
								},
								className: "w-full text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium hover:file:bg-slate-200"
							}),
							/* @__PURE__ */ o("span", {
								className: "mt-1 block text-xs text-slate-500",
								children: "First row is the header; each column becomes a field, each row a recipient."
							})
						]
					})
				]
			})]
		}),
		$.length > 0 && /* @__PURE__ */ s("p", {
			className: "mb-4 rounded-md bg-amber-50 px-4 py-2 text-sm text-amber-800",
			children: [
				"The CSV is missing columns the ",
				X.name,
				" template requires:",
				" ",
				$.join(", ")
			]
		}),
		/* @__PURE__ */ s("section", {
			className: q ? "rounded-xl border border-slate-200 bg-white" : "",
			children: [q ? /* @__PURE__ */ s("button", {
				type: "button",
				onClick: () => H((e) => !e),
				"aria-expanded": V,
				className: "flex w-full items-center justify-between px-6 py-4 text-left",
				children: [/* @__PURE__ */ s("span", {
					className: "text-base font-semibold",
					children: [
						"Recipients",
						" ",
						/* @__PURE__ */ s("span", {
							className: "text-sm font-normal text-slate-500",
							children: [
								u.rows.length,
								" row",
								u.rows.length === 1 ? "" : "s"
							]
						})
					]
				}), /* @__PURE__ */ o("span", {
					"aria-hidden": "true",
					className: "text-slate-400",
					children: V ? "▾" : "▸"
				})]
			}) : /* @__PURE__ */ s("h3", {
				className: "mb-3 text-base font-semibold",
				children: [
					"Recipients",
					" ",
					/* @__PURE__ */ s("span", {
						className: "text-sm font-normal text-slate-500",
						children: [
							u.rows.length,
							" row",
							u.rows.length === 1 ? "" : "s"
						]
					})
				]
			}), /* @__PURE__ */ o("div", {
				className: q ? `border-t border-slate-200 p-6 ${V ? "" : "hidden"}` : "",
				children: u.columns.length === 0 ? /* @__PURE__ */ o("p", {
					className: "rounded-xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center text-sm text-slate-500",
					children: "Upload a CSV to load recipients. You can edit cells, delete rows, and insert new ones after the upload."
				}) : /* @__PURE__ */ o(M, {
					columns: u.columns,
					rows: u.rows,
					onChange: (e) => Z({ rows: e }),
					readOnly: q
				})
			})]
		}),
		F && (F.entries.length > 0 || Object.keys(F.credentials).length > 0) && /* @__PURE__ */ s("section", {
			className: "mt-8",
			children: [
				/* @__PURE__ */ o("h3", {
					className: "mb-3 text-base font-semibold",
					children: "Activity log"
				}),
				F.entries.length > 0 && /* @__PURE__ */ o("ul", {
					className: "mb-4 space-y-1",
					children: F.entries.map(({ type: e, at: t, recipientCount: n }, r) => /* @__PURE__ */ s("li", {
						className: "text-sm text-slate-600",
						children: [
							e === "notification-triggered" ? `Notifications sent to ${n ?? "?"} recipient${n === 1 ? "" : "s"}` : e,
							" ",
							"— ",
							new Date(t).toLocaleString()
						]
					}, `${t}-${r}`))
				}),
				Object.keys(F.credentials).length > 0 && /* @__PURE__ */ o("div", {
					className: "overflow-x-auto rounded-xl border border-slate-200 bg-white",
					children: /* @__PURE__ */ s("table", {
						className: "w-full min-w-max border-collapse text-sm",
						children: [/* @__PURE__ */ o("thead", { children: /* @__PURE__ */ s("tr", {
							className: "border-b border-slate-200 bg-slate-50 text-left",
							children: [
								/* @__PURE__ */ o("th", {
									className: "px-3 py-2 font-medium text-slate-700",
									children: "Recipient"
								}),
								/* @__PURE__ */ o("th", {
									className: "px-3 py-2 font-medium text-slate-700",
									children: "Emailed"
								}),
								/* @__PURE__ */ o("th", {
									className: "px-3 py-2 font-medium text-slate-700",
									children: "Collected"
								}),
								/* @__PURE__ */ o("th", {
									className: "px-3 py-2 font-medium text-slate-700",
									children: "Status"
								}),
								/* @__PURE__ */ o("th", {
									className: "px-3 py-2",
									"aria-label": "Actions"
								})
							]
						}) }), /* @__PURE__ */ o("tbody", { children: (() => {
							let t = [], n = /* @__PURE__ */ new Set();
							u.rows.forEach((e, r) => {
								let i = (e.credId ?? "").split(",").filter((e) => F.credentials[e]);
								i.length && (t.push({
									key: `row-${r}`,
									rowIndex: r,
									credIds: i
								}), i.forEach((e) => n.add(e)));
							});
							for (let e of Object.keys(F.credentials)) n.has(e) || t.push({
								key: e,
								credIds: [e]
							});
							return t.map(({ key: t, rowIndex: n, credIds: r }) => {
								let i = n === void 0 ? void 0 : u.rows[n], a = r.map((e) => ({
									credId: e,
									entry: F.credentials[e]
								})), c = a.map(({ entry: e }) => e.emailSentAt).filter((e) => !!e), l = a.flatMap(({ entry: e }) => e.collections ?? (e.collectedAt ? [e.collectedAt] : [])), d = a.filter(({ entry: e }) => e.revocationToken || e.revokedAt), f = d.filter(({ entry: e }) => e.revokedAt), p = te.has(t);
								return /* @__PURE__ */ s(e, { children: [/* @__PURE__ */ s("tr", {
									className: "border-b border-slate-100 last:border-b-0",
									children: [
										/* @__PURE__ */ o("td", {
											className: "px-3 py-2",
											children: /* @__PURE__ */ s("button", {
												type: "button",
												onClick: () => G(t),
												"aria-expanded": p,
												className: "flex items-start gap-2 text-left",
												children: [/* @__PURE__ */ o("span", {
													"aria-hidden": "true",
													className: "mt-0.5 text-slate-400",
													children: p ? "▾" : "▸"
												}), i ? /* @__PURE__ */ s("span", { children: [/* @__PURE__ */ o("span", {
													className: "block text-slate-800",
													children: i.recipientName || "(no name)"
												}), /* @__PURE__ */ o("span", {
													className: "block text-xs text-slate-500",
													children: i.recipientEmail
												})] }) : /* @__PURE__ */ o("span", {
													className: "font-mono text-xs text-slate-500",
													children: t
												})]
											})
										}),
										/* @__PURE__ */ o("td", {
											className: "px-3 py-2 text-slate-600",
											children: c.length === 0 ? "—" : c.length === 1 ? new Date(c[0]).toLocaleDateString() : "multiple"
										}),
										/* @__PURE__ */ o("td", {
											className: "px-3 py-2 text-slate-600",
											children: l.length === 0 ? "Not collected" : l.length === 1 ? new Date(l[0]).toLocaleDateString() : "multiple"
										}),
										/* @__PURE__ */ o("td", {
											className: "px-3 py-2 text-slate-600",
											children: d.length === 0 ? "—" : d.length === 1 ? d[0].entry.revokedAt ? /* @__PURE__ */ o("span", {
												className: "text-red-600",
												children: "Revoked"
											}) : /* @__PURE__ */ o("button", {
												type: "button",
												onClick: () => void Y(d[0].credId, d[0].entry.revocationToken),
												disabled: L !== null,
												className: "rounded-md border border-red-300 px-2 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50",
												children: L === d[0].credId ? "Revoking…" : "Revoke"
											}) : f.length === d.length ? /* @__PURE__ */ s("span", {
												className: "text-red-600",
												children: [
													"Revoked (",
													d.length,
													" copies)"
												]
											}) : /* @__PURE__ */ s("span", {
												className: "flex flex-wrap items-center gap-2",
												children: [f.length > 0 && /* @__PURE__ */ s("span", {
													className: "text-red-600",
													children: [
														f.length,
														" of ",
														d.length,
														" revoked"
													]
												}), /* @__PURE__ */ s("button", {
													type: "button",
													onClick: () => {
														p || G(t);
													},
													disabled: L !== null,
													title: "Open the row to revoke each copy separately",
													className: "rounded-md border border-red-300 px-2 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50",
													children: [
														"Revoke… (",
														d.length,
														" copies)"
													]
												})]
											})
										}),
										/* @__PURE__ */ o("td", {
											className: "px-3 py-2",
											children: i && /* @__PURE__ */ o("button", {
												type: "button",
												onClick: () => void re(n, t),
												disabled: U !== null || x,
												title: "Email this recipient a fresh collection link",
												className: "rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-50",
												children: U === t ? "Resending…" : "Resend"
											})
										})
									]
								}), p && /* @__PURE__ */ o("tr", {
									className: "border-b border-slate-100 bg-slate-50/60 last:border-b-0",
									children: /* @__PURE__ */ o("td", {
										colSpan: 5,
										className: "px-3 py-3",
										children: /* @__PURE__ */ o("div", {
											className: "space-y-3 text-xs text-slate-600",
											children: a.map(({ credId: e, entry: t }, n) => {
												let r = t.collections ?? (t.collectedAt ? [t.collectedAt] : []);
												return /* @__PURE__ */ s("div", {
													className: "grid gap-3 rounded-md border border-slate-200 bg-white p-3 sm:grid-cols-3",
													children: [
														/* @__PURE__ */ s("div", { children: [
															/* @__PURE__ */ o("p", {
																className: "mb-1 font-medium text-slate-700",
																children: a.length > 1 ? `Copy ${n + 1} — notified` : "Notified"
															}),
															/* @__PURE__ */ o("p", { children: t.emailSentAt ? new Date(t.emailSentAt).toLocaleString() : "Not emailed" }),
															/* @__PURE__ */ o("p", {
																className: "mt-2 font-medium text-slate-700",
																children: "Credential id"
															}),
															/* @__PURE__ */ o("p", {
																className: "break-all font-mono",
																children: e
															})
														] }),
														/* @__PURE__ */ s("div", { children: [/* @__PURE__ */ o("p", {
															className: "mb-1 font-medium text-slate-700",
															children: "Collected"
														}), r.length === 0 ? /* @__PURE__ */ o("p", { children: "Not collected" }) : /* @__PURE__ */ o("ul", {
															className: "space-y-0.5",
															children: r.map((e, t) => /* @__PURE__ */ o("li", { children: new Date(e).toLocaleString() }, `${e}-${t}`))
														})] }),
														/* @__PURE__ */ s("div", { children: [/* @__PURE__ */ o("p", {
															className: "mb-1 font-medium text-slate-700",
															children: "Status"
														}), t.revokedAt ? /* @__PURE__ */ s("p", {
															className: "text-red-600",
															children: ["Revoked ", new Date(t.revokedAt).toLocaleString()]
														}) : t.revocationToken ? /* @__PURE__ */ o("button", {
															type: "button",
															onClick: () => void Y(e, t.revocationToken),
															disabled: L !== null,
															className: "rounded-md border border-red-300 px-2 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50",
															children: L === e ? "Revoking…" : "Revoke this copy"
														}) : /* @__PURE__ */ o("p", { children: "No status position (not collected)" })] })
													]
												}, e);
											})
										})
									})
								})] }, t);
							});
						})() })]
					})
				})
			]
		})
	] });
}
//#endregion
//#region src/BatchIssuerPanel.tsx
function F({ adapter: e, initialSpaceUrl: n }) {
	let [r, a] = i(n ? { page: "loading" } : { page: "list" });
	return t(() => {
		if (!n) return;
		let t = !1;
		return C(e, n).then((e) => {
			t || a(e ? {
				page: "edit",
				batch: {
					...e,
					spaceUrl: n
				}
			} : { page: "list" });
		}).catch((e) => {
			let n = g("open-batch", e);
			t || a({
				page: "list",
				error: n
			});
		}), () => {
			t = !0;
		};
	}, [e, n]), r.page === "loading" ? /* @__PURE__ */ o("p", {
		className: "text-sm text-slate-500",
		children: "Loading batch…"
	}) : r.page === "list" ? /* @__PURE__ */ o(k, {
		adapter: e,
		openError: r.error,
		onEdit: (e) => a({
			page: "edit",
			batch: e
		})
	}) : /* @__PURE__ */ o(P, {
		adapter: e,
		initialBatch: r.batch,
		onDone: () => a({ page: "list" })
	});
}
//#endregion
export { F as BatchIssuerPanel, y as parseSpaceUrl };
