import React, { useMemo, useState, useEffect } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  useNavigate,
  useParams
} from "react-router-dom";
import {
  ThemeProvider,
  createTheme,
  Container,
  Box,
  Typography,
  TextField,
  Button,
  Grid,
  Card,
  CardContent,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  IconButton,
  Alert,
  Snackbar,
  Chip,
  Stack,
  Divider,
  Tooltip
} from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import InsertLinkIcon from "@mui/icons-material/InsertLink";
import BarChartIcon from "@mui/icons-material/BarChart";

// LocalStorage keys and helpers
const LS_KEYS = { LINKS: "__short_links__", LOGS: "__logs__" };
const host = "http://localhost:3000";
const save = (k, v) => localStorage.setItem(k, JSON.stringify(v));
const load = (k, d) => {
  try {
    return JSON.parse(localStorage.getItem(k)) || d;
  } catch {
    return d;
  }
};
const now = () => Date.now();
const min = 60 * 1000;
const rand = () => Math.random().toString(36).slice(2, 8);
const alnum = /^[a-zA-Z0-9_-]{3,20}$/;
const isUrl = s => {
  try {
    new URL(s);
    return true;
  } catch {
    return false;
  }
};
const uniq = (links, code) => !links.some(x => x.code === code);
const Logger = {
  push: (level, msg, data) => {
    const logs = load(LS_KEYS.LOGS, []);
    logs.push({ t: new Date().toISOString(), level, msg, data });
    save(LS_KEYS.LOGS, logs);
  }
};

// Hook for links with auto-clean expired
const useLinks = () => {
  const [links, setLinks] = useState(load(LS_KEYS.LINKS, []));
  useEffect(() => {
    const fresh = links.filter(l => l.expires > now());
    if (fresh.length !== links.length) {
      setLinks(fresh);
    } else {
      save(LS_KEYS.LINKS, links);
    }
  }, [links]);
  return [links, setLinks];
};

// Shorten Form
const ShortenForm = ({ onCreate }) => {
  const [rows, setRows] = useState([{ url: "", validity: "", code: "" }]);
  const addRow = () =>
    rows.length < 5 && setRows([...rows, { url: "", validity: "", code: "" }]);
  const upd = (i, k, v) => {
    const r = [...rows];
    r[i][k] = v;
    setRows(r);
  };
  const rm = i => {
    const r = [...rows];
    r.splice(i, 1);
    setRows(r.length ? r : [{ url: "", validity: "", code: "" }]);
  };
  const [err, setErr] = useState("");
  const submit = () => {
    const out = [];
    for (let i = 0; i < rows.length; i++) {
      const { url, validity, code } = rows[i];
      if (!url || !isUrl(url)) return setErr(`Row ${i + 1}: invalid URL`);
      if (validity && (!/^[0-9]+$/.test(validity) || +validity <= 0))
        return setErr(`Row ${i + 1}: validity must be positive minutes`);
      if (code && !alnum.test(code))
        return setErr(
          `Row ${i + 1}: shortcode must be 3-20 [A-Za-z0-9_-]`
        );
      out.push({
        url,
        validity: validity ? +validity : 30,
        code: code || ""
      });
    }
    setErr("");
    onCreate(out);
    setRows([{ url: "", validity: "", code: "" }]);
  };
  return (
    <Card className="rounded-2xl" elevation={2}>
      <CardContent>
        <Stack spacing={2}>
          <Typography variant="h6">Shorten up to 5 URLs</Typography>
          {rows.map((r, i) => (
            <Box key={i}>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} md={6}>
                  <TextField
                    size="small"
                    label="Original URL"
                    fullWidth
                    value={r.url}
                    onChange={e => upd(i, "url", e.target.value)}
                  />
                </Grid>
                <Grid item xs={6} md={3}>
                  <TextField
                    size="small"
                    label="Validity (min, default 30)"
                    fullWidth
                    value={r.validity}
                    onChange={e => upd(i, "validity", e.target.value)}
                  />
                </Grid>
                <Grid item xs={6} md={3}>
                  <TextField
                    size="small"
                    label="Custom shortcode (opt)"
                    fullWidth
                    value={r.code}
                    onChange={e => upd(i, "code", e.target.value)}
                  />
                </Grid>
                <Grid item xs={6}>
                  <Button
                    onClick={addRow}
                    disabled={rows.length >= 5}
                    variant="contained"
                    startIcon={<InsertLinkIcon />}
                  >
                    Add Row
                  </Button>
                </Grid>
                <Grid item xs={6}>
                  <Button
                    onClick={() => rm(i)}
                    disabled={rows.length <= 1}
                    variant="outlined"
                  >
                    Remove
                  </Button>
                </Grid>
              </Grid>
              <Divider sx={{ mt: 2 }} />
            </Box>
          ))}
          <Stack direction="row" spacing={2}>
            <Button variant="contained" onClick={submit}>
              Shorten
            </Button>
            <Button
              variant="text"
              onClick={() => setRows([{ url: "", validity: "", code: "" }])}
            >
              Reset
            </Button>
          </Stack>
          {!!err && (
            <Alert severity="error" onClose={() => setErr("")}>
              {err}
            </Alert>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
};

// Links Table
const LinksTable = ({ items, onCopy }) => {
  return (
    <Card elevation={1}>
      <CardContent>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
        >
          <Typography variant="h6">Shortened Links</Typography>
          <Chip label={`${items.length}`} />
        </Stack>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Short URL</TableCell>
              <TableCell>Original</TableCell>
              <TableCell>Expires</TableCell>
              <TableCell>Visits</TableCell>
              <TableCell>Copy</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map(x => {
              const expLeft = Math.max(
                0,
                Math.ceil((x.expires - now()) / min)
              );
              return (
                <TableRow key={x.code}>
                  <TableCell>
                    <Link to={`/${x.code}`}>{`${host}/${x.code}`}</Link>
                  </TableCell>
                  <TableCell
                    style={{
                      maxWidth: 260,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap"
                    }}
                  >
                    <a href={x.url} target="_blank" rel="noreferrer">
                      {x.url}
                    </a>
                  </TableCell>
                  <TableCell>{expLeft} min</TableCell>
                  <TableCell>{x.visits || 0}</TableCell>
                  <TableCell>
                    <Tooltip title="Copy">
                      <IconButton onClick={() => onCopy(`${host}/${x.code}`)}>
                        <ContentCopyIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

// Home
const Home = () => {
  const [links, setLinks] = useLinks();
  const [toast, setToast] = useState("");

  const add = rows => {
    let cur = [...links];
    const out = [];

    for (const r of rows) {
      let code = r.code || rand();
      let attempts = 0;
      while (!uniq(cur, code) && attempts < 10) {
        code = rand();
        attempts++;
      }
      if (!uniq(cur, code)) {
        setToast(`Failed to generate unique shortcode after retries`);
        Logger.push("error", "shortcode_collision", { code });
        return;
      }

      const item = {
        code,
        url: r.url,
        created: now(),
        expires: now() + (r.validity || 30) * min,
        visits: 0
      };

      cur = [item, ...cur];
      out.push(item);
      Logger.push("info", "create_short", {
        code,
        url: r.url,
        validity: r.validity || 30
      });
    }

    setLinks(cur);
    setToast(`${out.length} link(s) created`);
  };

  const copy = s => {
    navigator.clipboard.writeText(s).then(() => setToast("Copied!"));
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 3 }}>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
        >
          <Typography variant="h5">URL Shortener</Typography>
          <Stack direction="row" spacing={1}>
            <Button component={Link} to="/stats" startIcon={<BarChartIcon />}>
              Statistics
            </Button>
          </Stack>
        </Stack>
        <ShortenForm onCreate={add} />
        <Box sx={{ my: 2 }} />
        {links.length > 0 && <LinksTable items={links} onCopy={copy} />}
        <Snackbar
          autoHideDuration={2000}
          open={!!toast}
          onClose={() => setToast("")}
          message={toast}
        />
      </Box>
    </Container>
  );
};

// Stats
const Stats = () => {
  const [links] = useLinks();
  const rows = useMemo(
    () =>
      links.map(x => ({
        code: x.code,
        short: `${host}/${x.code}`,
        url: x.url,
        created: new Date(x.created).toLocaleString(),
        expires: new Date(x.expires).toLocaleString(),
        remaining: Math.max(0, Math.ceil((x.expires - now()) / min)),
        visits: x.visits || 0
      })),
    [links]
  );

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 3 }}>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
        >
          <Typography variant="h5">Statistics</Typography>
          <Button component={Link} to="/">
            Back
          </Button>
        </Stack>
        <Card elevation={1}>
          <CardContent>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Short</TableCell>
                  <TableCell>Original</TableCell>
                  <TableCell>Created</TableCell>
                  <TableCell>Expires</TableCell>
                  <TableCell>Remaining(min)</TableCell>
                  <TableCell>Visits</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map(r => (
                  <TableRow key={r.code}>
                    <TableCell>
                      <a href={r.short} target="_blank" rel="noreferrer">
                        {r.short}
                      </a>
                    </TableCell>
                    <TableCell
                      style={{
                        maxWidth: 300,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap"
                      }}
                    >
                      {r.url}
                    </TableCell>
                    <TableCell>{r.created}</TableCell>
                    <TableCell>{r.expires}</TableCell>
                    <TableCell>{r.remaining}</TableCell>
                    <TableCell>{r.visits}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
};

// Redirect
const Redirect = () => {
  const { code } = useParams();
  const nav = useNavigate();
  useEffect(() => {
    const links = load(LS_KEYS.LINKS, []);
    const idx = links.findIndex(x => x.code === code);
    if (idx < 0) {
      Logger.push("error", "not_found", { code });
      nav("/", { replace: true });
      return;
    }
    const item = links[idx];
    if (now() > item.expires) {
      Logger.push("warn", "expired", { code });
      nav("/", { replace: true });
      return;
    }
    item.visits = (item.visits || 0) + 1;
    links[idx] = item;
    save(LS_KEYS.LINKS, links);
    window.location.href = item.url;
  }, [code, nav]);
  return (
    <Container maxWidth="sm">
      <Box sx={{ py: 6 }}>
        <Alert severity="info">Redirecting...</Alert>
      </Box>
    </Container>
  );
};

// App
export default function App() {
  const theme = useMemo(() => createTheme({ palette: { mode: "light" } }), []);
  return (
    <ThemeProvider theme={theme}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path=":code" element={<Redirect />} />
          <Route path="/stats" element={<Stats />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}
