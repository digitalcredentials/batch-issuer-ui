import { Fragment as e, useEffect as t, useMemo as n, useRef as r, useState as i } from "react";
import { Fragment as a, jsx as o, jsxs as s } from "react/jsx-runtime";
import c from "papaparse";
//#region src/lib/batches.ts
var l = "batch", u = "batch.json";
function d(e) {
	let t = e.match(/^(.+)\/space\/([^/?#]+)$/);
	return t ? {
		serverUrl: t[1],
		spaceId: t[2]
	} : null;
}
async function f(e) {
	let t = await e.getSession();
	if (!t) throw e.onUnauthorized(), Error("Not logged in.");
	return t.client;
}
function p(e, t) {
	let n = d(t);
	if (!n) throw Error(`Not a space URL: ${t}`);
	return e.space(n.spaceId).collection(l);
}
async function m(e, t) {
	let n = await f(e), r = t.spaceUrl;
	if (!r) {
		r = await e.spaces.create("batch", t.name);
		let i = d(r);
		if (!i) throw Error(`Not a space URL: ${r}`);
		await n.space(i.spaceId).createCollection({
			id: l,
			name: "Batch"
		});
	}
	let i = {
		...t,
		spaceUrl: r,
		updatedAt: (/* @__PURE__ */ new Date()).toISOString()
	}, a = JSON.parse(JSON.stringify(i));
	return await p(n, r).put(u, a), i;
}
async function h(e, t) {
	let n = await p(await f(e), t).get(u);
	return n && !(n instanceof Blob) ? n : null;
}
async function g(e, t) {
	let n = await f(e), r = d(t);
	if (!r) return null;
	let i = await n.space(r.spaceId).collection("logs").get("log.json").catch(() => null);
	if (!i || i instanceof Blob) return null;
	let a = i;
	return {
		entries: a.entries ?? [],
		credentials: a.credentials ?? {}
	};
}
function _(e) {
	return !!e?.entries.some(({ type: e }) => e === "notification-triggered");
}
async function v(e, t, n, r) {
	await e.revokeStatus(r);
	let i = await f(e), a = d(t);
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
async function y(e) {
	let t = await f(e), n = (await e.spaces.list()).filter(({ type: e }) => e === "batch");
	return (await Promise.all(n.map(async (e) => {
		try {
			let n = await p(t, e.url).get(u);
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
function b() {
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
function x({ adapter: e, onEdit: n }) {
	let [r, c] = i(null), [l, u] = i(null);
	return t(() => {
		y(e).then(c, (e) => {
			u(e instanceof Error ? e.message : "Failed to load batches."), c([]);
		});
	}, [e]), /* @__PURE__ */ s("div", { children: [
		/* @__PURE__ */ s("div", {
			className: "mb-6 flex items-center justify-between",
			children: [/* @__PURE__ */ o("h2", {
				className: "text-xl font-semibold",
				children: "Credential batches"
			}), /* @__PURE__ */ o("button", {
				type: "button",
				onClick: () => n(b()),
				className: "rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700",
				children: "New batch"
			})]
		}),
		l && /* @__PURE__ */ o("p", {
			className: "mb-4 text-sm text-red-600",
			children: l
		}),
		r === null ? /* @__PURE__ */ o("p", {
			className: "text-sm text-slate-500",
			children: "Loading batches…"
		}) : r.length === 0 ? /* @__PURE__ */ o("p", {
			className: "text-sm text-slate-500",
			children: "No batches yet. Create one to issue credentials to a list of recipients. Each batch gets its own storage space."
		}) : /* @__PURE__ */ o("ul", {
			className: "divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white",
			children: r.map((e) => /* @__PURE__ */ s("li", {
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
function S(e) {
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
async function C(e) {
	let t = e.replace(/\/+$/, ""), n = await fetch(`${t}/templates`);
	if (!n.ok) throw Error(`Failed to load templates: ${n.status}`);
	let { templates: r } = await n.json();
	return r;
}
//#endregion
//#region src/components/RowGrid.tsx
function te({ columns: e, rows: t, onChange: n, readOnly: r = !1 }) {
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
var w = "w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none";
function T({ adapter: a, initialBatch: c, onDone: l }) {
	let [u, d] = i(c), [f, p] = i(null), [h, y] = i(null), [b, x] = i(null), [T, E] = i(!1), [D, O] = i(!1), [k, A] = i(!1), [ne, j] = i(null), [M, N] = i(null), [P, F] = i(null), [I, L] = i(!1), [R, z] = i(!1), [B, V] = i(null), [H, U] = i(/* @__PURE__ */ new Set());
	function W(e) {
		U((t) => {
			let n = new Set(t);
			return n.has(e) ? n.delete(e) : n.add(e), n;
		});
	}
	async function G(e, t) {
		let n = u.rows[e];
		if (n && confirm(`Resend the notification email to ${n.recipientEmail || "this recipient"}?`)) {
			V(t), y(null);
			try {
				let { recipientRows: t, failures: r } = await a.notifyRecipients({
					...u,
					rows: [n]
				});
				if (r.length) {
					y(`The resend failed: ${r[0].reason}`);
					return;
				}
				let i = Object.keys(t ?? {})[0];
				if (i) {
					let t = u.rows.map((t, n) => n === e ? {
						...t,
						credId: t.credId ? `${t.credId},${i}` : i
					} : t), n = await m(a, {
						...u,
						rows: t
					});
					d(n);
				}
				u.spaceUrl && await J(u.spaceUrl);
			} catch (e) {
				y(e instanceof Error ? e.message : "The resend failed.");
			} finally {
				V(null);
			}
		}
	}
	let K = r(null), q = _(M);
	t(() => {
		C(a.templatesApiBase).then(p, (e) => {
			p([]), y(e instanceof Error ? e.message : "Failed to load templates.");
		});
	}, [a]);
	async function J(e) {
		try {
			N(await g(a, e));
		} catch {}
	}
	t(() => {
		c.spaceUrl && J(c.spaceUrl);
	}, [c.spaceUrl]);
	async function Y(e, t) {
		if (confirm("Revoke this credential? Verifiers will see it as revoked. This cannot be undone here.")) {
			F(e), y(null);
			try {
				await v(a, u.spaceUrl, e, t), await J(u.spaceUrl);
			} catch (e) {
				y(e instanceof Error ? e.message : "The revocation failed.");
			} finally {
				F(null);
			}
		}
	}
	let X = n(() => f?.find(({ id: e }) => e === u.templateId) ?? null, [f, u.templateId]);
	function Z(e) {
		d((t) => ({
			...t,
			...e
		})), j(null);
	}
	function Q(e) {
		d((t) => ({
			...t,
			issuer: {
				...t.issuer,
				...e
			}
		})), j(null);
	}
	async function re(e) {
		y(null);
		try {
			let { columns: t, rows: n } = await S(e);
			if (u.rows.length && !confirm(`Replace the current ${u.rows.length} row(s) with ${n.length} row(s) from "${e.name}"?`)) return;
			Z({
				columns: t,
				rows: n
			});
		} catch (e) {
			y(e instanceof Error ? e.message : "Failed to parse CSV.");
		} finally {
			K.current && (K.current.value = "");
		}
	}
	async function ie() {
		if (!u.name.trim()) {
			y("A batch needs a name before it can be saved.");
			return;
		}
		E(!0), y(null);
		try {
			let e = await m(a, u);
			d(e), j(e.updatedAt);
		} catch (e) {
			y(e instanceof Error ? e.message : "Failed to save batch.");
		} finally {
			E(!1);
		}
	}
	async function ae() {
		if (confirm("We're about to email all recipients in your batch to let them know they can now collect their credential. Okay to send the emails?")) {
			O(!0), y(null), x(null);
			try {
				let { sent: e, failures: t, recipientRows: n } = await a.notifyRecipients(u);
				if (x(`Emailed ${e} recipient${e === 1 ? "" : "s"}.`), t.length && y(`${t.length} row${t.length === 1 ? "" : "s"} failed: ` + t.map(({ row: e, reason: t }) => `row ${e + 1} (${t})`).join("; ")), n && Object.keys(n).length) {
					let e = new Map(Object.entries(n).map(([e, t]) => [t, e])), t = u.rows.map((t, n) => {
						let r = e.get(n);
						return r ? {
							...t,
							credId: t.credId ? `${t.credId},${r}` : r
						} : t;
					}), r = await m(a, {
						...u,
						rows: t
					});
					d(r);
				}
			} catch (e) {
				y(e instanceof Error ? e.message : "Failed to notify recipients.");
			} finally {
				O(!1), u.spaceUrl && J(u.spaceUrl);
			}
		}
	}
	async function oe() {
		if (confirm(`Delete batch "${u.name || u.id}"? This deletes the batch's whole storage space and cannot be undone.`)) {
			A(!0), y(null);
			try {
				await ee(a, u), l();
			} catch (e) {
				y(e instanceof Error ? e.message : "Failed to delete batch."), A(!1);
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
					ne && /* @__PURE__ */ o("span", {
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
						onClick: oe,
						disabled: k,
						className: "rounded-md border border-red-200 px-4 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50",
						children: k ? "Deleting…" : "Delete"
					}),
					/* @__PURE__ */ o("button", {
						type: "button",
						onClick: ae,
						disabled: D || !u.spaceUrl || u.rows.length === 0,
						title: u.spaceUrl ? u.rows.length === 0 ? "Upload recipients first" : "Email every recipient a collection link" : "Save the batch first",
						className: "rounded-md border border-indigo-300 px-4 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-50 disabled:opacity-50",
						children: D ? "Notifying…" : q ? "Resend Notifications" : "Notify recipients"
					}),
					!q && /* @__PURE__ */ o("button", {
						type: "button",
						onClick: ie,
						disabled: T,
						className: "rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50",
						children: T ? "Saving…" : "Save batch"
					})
				]
			})]
		}),
		q && /* @__PURE__ */ o("p", {
			className: "mb-4 rounded-md bg-amber-50 px-4 py-2 text-sm font-medium text-amber-800",
			children: "The recipients have been notified and so the batch details can no longer be changed."
		}),
		h && /* @__PURE__ */ o("p", {
			className: "mb-4 rounded-md bg-red-50 px-4 py-2 text-sm text-red-700",
			children: h
		}),
		b && /* @__PURE__ */ o("p", {
			className: "mb-4 rounded-md bg-green-50 px-4 py-2 text-sm text-green-800",
			children: b
		}),
		u.spaceUrl && /* @__PURE__ */ s("p", {
			className: "mb-4 text-xs text-slate-400",
			children: ["Batch space: ", u.spaceUrl]
		}),
		/* @__PURE__ */ s("section", {
			className: "mb-8 rounded-xl border border-slate-200 bg-white",
			children: [q && /* @__PURE__ */ s("button", {
				type: "button",
				onClick: () => L((e) => !e),
				"aria-expanded": I,
				className: "flex w-full items-center justify-between px-6 py-4 text-left",
				children: [/* @__PURE__ */ o("span", {
					className: "text-base font-semibold",
					children: "Batch details"
				}), /* @__PURE__ */ o("span", {
					"aria-hidden": "true",
					className: "text-slate-400",
					children: I ? "▾" : "▸"
				})]
			}), /* @__PURE__ */ s("div", {
				className: `grid gap-4 p-6 sm:grid-cols-2 ${q ? `border-t border-slate-200 ${I ? "" : "hidden"}` : ""}`,
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
							className: w
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
							className: w
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
							className: w
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
							className: w
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
								className: w
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
								className: w
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
								className: w,
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
									t && re(t);
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
				onClick: () => z((e) => !e),
				"aria-expanded": R,
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
					children: R ? "▾" : "▸"
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
				className: q ? `border-t border-slate-200 p-6 ${R ? "" : "hidden"}` : "",
				children: u.columns.length === 0 ? /* @__PURE__ */ o("p", {
					className: "rounded-xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center text-sm text-slate-500",
					children: "Upload a CSV to load recipients. You can edit cells, delete rows, and insert new ones after the upload."
				}) : /* @__PURE__ */ o(te, {
					columns: u.columns,
					rows: u.rows,
					onChange: (e) => Z({ rows: e }),
					readOnly: q
				})
			})]
		}),
		M && (M.entries.length > 0 || Object.keys(M.credentials).length > 0) && /* @__PURE__ */ s("section", {
			className: "mt-8",
			children: [
				/* @__PURE__ */ o("h3", {
					className: "mb-3 text-base font-semibold",
					children: "Activity log"
				}),
				M.entries.length > 0 && /* @__PURE__ */ o("ul", {
					className: "mb-4 space-y-1",
					children: M.entries.map(({ type: e, at: t, recipientCount: n }, r) => /* @__PURE__ */ s("li", {
						className: "text-sm text-slate-600",
						children: [
							e === "notification-triggered" ? `Notifications sent to ${n ?? "?"} recipient${n === 1 ? "" : "s"}` : e,
							" ",
							"— ",
							new Date(t).toLocaleString()
						]
					}, `${t}-${r}`))
				}),
				Object.keys(M.credentials).length > 0 && /* @__PURE__ */ o("div", {
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
								let i = (e.credId ?? "").split(",").filter((e) => M.credentials[e]);
								i.length && (t.push({
									key: `row-${r}`,
									rowIndex: r,
									credIds: i
								}), i.forEach((e) => n.add(e)));
							});
							for (let e of Object.keys(M.credentials)) n.has(e) || t.push({
								key: e,
								credIds: [e]
							});
							return t.map(({ key: t, rowIndex: n, credIds: r }) => {
								let i = n === void 0 ? void 0 : u.rows[n], a = r.map((e) => ({
									credId: e,
									entry: M.credentials[e]
								})), c = a.map(({ entry: e }) => e.emailSentAt).filter((e) => !!e), l = a.flatMap(({ entry: e }) => e.collections ?? (e.collectedAt ? [e.collectedAt] : [])), d = a.filter(({ entry: e }) => e.revocationToken || e.revokedAt), f = d.filter(({ entry: e }) => e.revokedAt), p = H.has(t);
								return /* @__PURE__ */ s(e, { children: [/* @__PURE__ */ s("tr", {
									className: "border-b border-slate-100 last:border-b-0",
									children: [
										/* @__PURE__ */ o("td", {
											className: "px-3 py-2",
											children: /* @__PURE__ */ s("button", {
												type: "button",
												onClick: () => W(t),
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
												disabled: P !== null,
												className: "rounded-md border border-red-300 px-2 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50",
												children: P === d[0].credId ? "Revoking…" : "Revoke"
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
														p || W(t);
													},
													disabled: P !== null,
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
												onClick: () => void G(n, t),
												disabled: B !== null || D,
												title: "Email this recipient a fresh collection link",
												className: "rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-50",
												children: B === t ? "Resending…" : "Resend"
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
															disabled: P !== null,
															className: "rounded-md border border-red-300 px-2 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50",
															children: P === e ? "Revoking…" : "Revoke this copy"
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
function E({ adapter: e, initialSpaceUrl: n }) {
	let [r, a] = i(n ? { page: "loading" } : { page: "list" });
	return t(() => {
		if (!n) return;
		let t = !1;
		return h(e, n).then((e) => {
			t || a(e ? {
				page: "edit",
				batch: {
					...e,
					spaceUrl: n
				}
			} : { page: "list" });
		}).catch(() => {
			t || a({ page: "list" });
		}), () => {
			t = !0;
		};
	}, [e, n]), r.page === "loading" ? /* @__PURE__ */ o("p", {
		className: "text-sm text-slate-500",
		children: "Loading batch…"
	}) : r.page === "list" ? /* @__PURE__ */ o(x, {
		adapter: e,
		onEdit: (e) => a({
			page: "edit",
			batch: e
		})
	}) : /* @__PURE__ */ o(T, {
		adapter: e,
		initialBatch: r.batch,
		onDone: () => a({ page: "list" })
	});
}
//#endregion
export { E as BatchIssuerPanel, d as parseSpaceUrl };
