"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { type Profile, loadProfilePage } from "@/lib/social";
import { supabase } from "@/lib/supabase";
import { Avatar, FollowButton, ItemGrid, Loves, type Order, OrderButton, ShareLink, TypeTabs, displayName, sortBy, useLovesStore } from "@/lib/feed-ui";
import { TabBar } from "@/lib/tabs";

// Public feed page. Works for anyone with the link, signed in or not.
export default function PublicFeed({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = use(params);
  const [p, setP] = useState<Profile | null | undefined>(undefined);
  const [signedIn, setSignedIn] = useState(false);
  const [type, setType] = useState("all");
  const [order, setOrder] = useState<Order>("new");
  const loves = useLovesStore(signedIn);
  const { load } = loves;
  useEffect(() => {
    (async () => {
      const [page, { data }] = await Promise.all([loadProfilePage(handle), supabase().auth.getSession()]);
      setP(page); setSignedIn(!!data.session);
      if (page && data.session) load(page.items.map(i => i.id));
    })();
  }, [handle, load]);

  return (
    <main className="tabscreen">
      <div className="scroll" style={{ paddingBottom: signedIn ? 110 : 40 }}>
        <div style={{ padding: "0 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          {signedIn ? <Link href="/feed" className="back">← Feed</Link> : <Link href="/" className="logo" style={{ textDecoration: "none" }}>Actually</Link>}
        </div>

        {p === null && <p className="lead" style={{ padding: "0 20px" }}>No one goes by {handle} here.</p>}

        {p && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "20px 20px 0" }}>
              <Avatar handle={p.handle} size={64} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="serif" style={{ fontSize: 30, lineHeight: 1 }}>{displayName(p.handle)}</div>
                <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 6 }}>{p.items.length} shared · {p.followers} {p.followers === 1 ? "follower" : "followers"} · {p.following} following</div>
              </div>
            </div>
            <div style={{ padding: "16px 20px 0" }}>
              {p.is_me ? <ShareLink handle={p.handle} />
                : signedIn ? <FollowButton handle={p.handle} initial={p.i_follow} />
                : <Link href="/" className="btn" style={{ height: 48, fontSize: 15 }}>Join Actually to follow {p.handle}</Link>}
            </div>
            {p.items.length > 0 && <TypeTabs items={p.items} value={type} onChange={setType} end={<OrderButton value={order} onChange={setOrder} />} />}
            <div style={{ padding: "16px 16px 0" }}>
              {p.items.length === 0 ? <p className="lead" style={{ padding: "0 4px" }}>Nothing shared yet.</p> : <Loves store={loves}><ItemGrid items={sortBy(p.items.filter(i => type === "all" || i.category === type), order)} mine={p.is_me} /></Loves>}
              {p.items.length > 0 && !p.is_me && <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 16, padding: "0 4px", lineHeight: 1.45 }}>{displayName(p.handle)} may earn a small reward if you buy something you find here.</div>}
            </div>
          </>
        )}
      </div>
      {signedIn && <TabBar />}
    </main>
  );
}
