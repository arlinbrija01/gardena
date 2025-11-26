import { useState, useEffect } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { Search, LogOut, User, Users, Trash2, Lock } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

axios.defaults.withCredentials = true;

const LoginPage = ({ onLogin }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.post(`${API}/auth/login`, {
        username,
        password,
      });
      onLogin(response.data);
      toast.success("Accesso effettuato con successo");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Credenziali non valide");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4">
      <Card className="w-full max-w-md shadow-lg" data-testid="login-card">
        <CardHeader className="space-y-1">
          <CardTitle className="text-3xl font-bold text-center text-slate-800">Accedi</CardTitle>
          <CardDescription className="text-center text-slate-600">
            Inserisci le tue credenziali per continuare
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-slate-700">Nome utente</Label>
              <Input
                id="username"
                data-testid="login-username-input"
                type="text"
                placeholder="Inserisci il tuo nome utente"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="border-slate-300 focus:border-slate-500"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-700">Password</Label>
              <Input
                id="password"
                data-testid="login-password-input"
                type="password"
                placeholder="Inserisci la tua password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="border-slate-300 focus:border-slate-500"
              />
            </div>
            <Button
              type="submit"
              data-testid="login-submit-button"
              className="w-full bg-slate-700 hover:bg-slate-800 text-white font-medium py-2 rounded-lg transition-colors"
              disabled={loading}
            >
              {loading ? "Accesso in corso..." : "Accedi"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

const HomePage = ({ user, onLogout }) => {
  const [posts, setPosts] = useState([]);
  const [content, setContent] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchPosts();
  }, []);

  useEffect(() => {
    // Ricerca in tempo reale
    const delaySearch = setTimeout(() => {
      if (searchQuery.trim()) {
        handleSearch();
      } else {
        fetchPosts();
      }
    }, 300);

    return () => clearTimeout(delaySearch);
  }, [searchQuery]);

  const fetchPosts = async () => {
    try {
      const response = await axios.get(`${API}/posts`);
      setPosts(response.data);
    } catch (error) {
      if (error.response?.status === 401) {
        onLogout();
      }
    }
  };

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;

    setLoading(true);
    try {
      await axios.post(`${API}/posts`, { content });
      setContent("");
      toast.success("Post pubblicato con successo");
      fetchPosts();
    } catch (error) {
      toast.error("Errore nella pubblicazione del post");
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePost = async (postId) => {
    try {
      await axios.delete(`${API}/posts/${postId}`);
      toast.success("Post eliminato con successo");
      fetchPosts();
    } catch (error) {
      toast.error("Errore nell'eliminazione del post");
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      fetchPosts();
      return;
    }

    try {
      const response = await axios.get(`${API}/posts/search?q=${encodeURIComponent(searchQuery)}`);
      setPosts(response.data);
    } catch (error) {
      toast.error("Errore nella ricerca");
    }
  };

  const formatDate = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100" data-testid="homepage">
      <nav className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-slate-800">Community</h1>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              data-testid="profile-button"
              onClick={() => navigate("/profilo")}
              className="text-slate-700 hover:text-slate-900 hover:bg-slate-100"
            >
              <User className="w-4 h-4 mr-2" />
              Il mio profilo
            </Button>
            {user.is_admin && (
              <Button
                variant="ghost"
                data-testid="admin-button"
                onClick={() => navigate("/admin")}
                className="text-slate-700 hover:text-slate-900 hover:bg-slate-100"
              >
                <Users className="w-4 h-4 mr-2" />
                Gestione utenti
              </Button>
            )}
            <Button
              variant="ghost"
              data-testid="logout-button"
              onClick={onLogout}
              className="text-slate-700 hover:text-slate-900 hover:bg-slate-100"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Esci
            </Button>
          </div>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <Card className="shadow-md" data-testid="search-card">
          <CardContent className="pt-6">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <Input
                  data-testid="search-input"
                  type="text"
                  placeholder="Cerca nei post..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 border-slate-300 focus:border-slate-500"
                />
              </div>
              {searchQuery && (
                <Button
                  type="button"
                  variant="outline"
                  data-testid="clear-search-button"
                  onClick={() => setSearchQuery("")}
                  className="border-slate-300 text-slate-700 hover:bg-slate-100"
                >
                  Cancella
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-md" data-testid="create-post-card">
          <CardHeader>
            <CardTitle className="text-xl text-slate-800">Crea un nuovo post</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreatePost} className="space-y-4">
              <Textarea
                data-testid="create-post-textarea"
                placeholder="Cosa vuoi condividere?"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="min-h-[100px] border-slate-300 focus:border-slate-500"
                required
              />
              <Button
                type="submit"
                data-testid="create-post-submit-button"
                disabled={loading}
                className="bg-slate-700 hover:bg-slate-800 text-white font-medium"
              >
                {loading ? "Pubblicazione..." : "Pubblica"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-4" data-testid="posts-list">
          {posts.length === 0 ? (
            <Card className="shadow-md">
              <CardContent className="py-12 text-center text-slate-500">
                Nessun post trovato
              </CardContent>
            </Card>
          ) : (
            posts.map((post) => (
              <Card key={post.id} className="shadow-md hover:shadow-lg transition-shadow" data-testid={`post-${post.id}`}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg text-slate-800" data-testid={`post-author-${post.id}`}>
                        {post.author_name}
                      </CardTitle>
                      <CardDescription data-testid={`post-date-${post.id}`}>
                        {formatDate(post.created_at)}
                      </CardDescription>
                    </div>
                    {(user.id === post.author_id || user.is_admin) && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            data-testid={`delete-post-button-${post.id}`}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Conferma eliminazione</AlertDialogTitle>
                            <AlertDialogDescription>
                              Sei sicuro di voler eliminare questo post? Questa azione non può essere annullata.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel data-testid={`delete-post-cancel-${post.id}`}>Annulla</AlertDialogCancel>
                            <AlertDialogAction
                              data-testid={`delete-post-confirm-${post.id}`}
                              onClick={() => handleDeletePost(post.id)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Elimina
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-700 whitespace-pre-wrap" data-testid={`post-content-${post.id}`}>{post.content}</p>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

const ProfilePage = ({ user, onLogout }) => {
  const [posts, setPosts] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchUserPosts();
  }, []);

  const fetchUserPosts = async () => {
    try {
      const response = await axios.get(`${API}/posts/user/${user.id}`);
      setPosts(response.data);
    } catch (error) {
      if (error.response?.status === 401) {
        onLogout();
      }
    }
  };

  const handleDeletePost = async (postId) => {
    try {
      await axios.delete(`${API}/posts/${postId}`);
      toast.success("Post eliminato con successo");
      fetchUserPosts();
    } catch (error) {
      toast.error("Errore nell'eliminazione del post");
    }
  };

  const formatDate = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100" data-testid="profile-page">
      <nav className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-slate-800">Il mio profilo</h1>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              data-testid="back-to-home-button"
              onClick={() => navigate("/")}
              className="text-slate-700 hover:text-slate-900 hover:bg-slate-100"
            >
              Torna alla home
            </Button>
            <Button
              variant="ghost"
              data-testid="profile-logout-button"
              onClick={onLogout}
              className="text-slate-700 hover:text-slate-900 hover:bg-slate-100"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Esci
            </Button>
          </div>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="text-2xl text-slate-800" data-testid="profile-username">{user.username}</CardTitle>
            <CardDescription data-testid="profile-posts-count">I tuoi post ({posts.length})</CardDescription>
          </CardHeader>
        </Card>

        <div className="space-y-4" data-testid="profile-posts-list">
          {posts.length === 0 ? (
            <Card className="shadow-md">
              <CardContent className="py-12 text-center text-slate-500">
                Non hai ancora pubblicato nessun post
              </CardContent>
            </Card>
          ) : (
            posts.map((post) => (
              <Card key={post.id} className="shadow-md hover:shadow-lg transition-shadow" data-testid={`profile-post-${post.id}`}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardDescription data-testid={`profile-post-date-${post.id}`}>
                      {formatDate(post.created_at)}
                    </CardDescription>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          data-testid={`profile-delete-post-button-${post.id}`}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Conferma eliminazione</AlertDialogTitle>
                          <AlertDialogDescription>
                            Sei sicuro di voler eliminare questo post? Questa azione non può essere annullata.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel data-testid={`profile-delete-post-cancel-${post.id}`}>Annulla</AlertDialogCancel>
                          <AlertDialogAction
                            data-testid={`profile-delete-post-confirm-${post.id}`}
                            onClick={() => handleDeletePost(post.id)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Elimina
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-700 whitespace-pre-wrap" data-testid={`profile-post-content-${post.id}`}>{post.content}</p>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

const AdminPage = ({ user, onLogout }) => {
  const [users, setUsers] = useState([]);
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [newPasswordForUser, setNewPasswordForUser] = useState("");
  const [openPasswordDialog, setOpenPasswordDialog] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user.is_admin) {
      navigate("/");
      return;
    }
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${API}/users`);
      setUsers(response.data);
    } catch (error) {
      if (error.response?.status === 401) {
        onLogout();
      }
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await axios.post(`${API}/users`, {
        username: newUsername,
        password: newPassword,
      });
      setNewUsername("");
      setNewPassword("");
      toast.success("Utente creato con successo");
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Errore nella creazione dell'utente");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    try {
      await axios.delete(`${API}/users/${userId}`);
      toast.success("Utente eliminato con successo");
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Errore nell'eliminazione dell'utente");
    }
  };

  const handleChangePassword = async (userId) => {
    if (!userId || !newPasswordForUser) return;

    try {
      await axios.put(`${API}/users/${userId}/password`, {
        new_password: newPasswordForUser,
      });
      setOpenPasswordDialog(null);
      setNewPasswordForUser("");
      toast.success("Password modificata con successo");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Errore nella modifica della password");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100" data-testid="admin-page">
      <nav className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-slate-800">Gestione utenti</h1>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              data-testid="admin-back-to-home-button"
              onClick={() => navigate("/")}
              className="text-slate-700 hover:text-slate-900 hover:bg-slate-100"
            >
              Torna alla home
            </Button>
            <Button
              variant="ghost"
              data-testid="admin-logout-button"
              onClick={onLogout}
              className="text-slate-700 hover:text-slate-900 hover:bg-slate-100"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Esci
            </Button>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <Card className="shadow-md" data-testid="create-user-card">
          <CardHeader>
            <CardTitle className="text-xl text-slate-800">Crea nuovo utente</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-username" className="text-slate-700">Nome utente</Label>
                <Input
                  id="new-username"
                  data-testid="admin-new-username-input"
                  type="text"
                  placeholder="Nome utente"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  required
                  className="border-slate-300 focus:border-slate-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-password" className="text-slate-700">Password</Label>
                <Input
                  id="new-password"
                  data-testid="admin-new-password-input"
                  type="password"
                  placeholder="Password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  className="border-slate-300 focus:border-slate-500"
                />
              </div>
              <Button
                type="submit"
                data-testid="admin-create-user-button"
                disabled={loading}
                className="bg-slate-700 hover:bg-slate-800 text-white font-medium"
              >
                {loading ? "Creazione..." : "Crea utente"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="shadow-md" data-testid="users-list-card">
          <CardHeader>
            <CardTitle className="text-xl text-slate-800">Utenti registrati ({users.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {users.map((u) => (
                <div
                  key={u.id}
                  data-testid={`user-item-${u.id}`}
                  className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200"
                >
                  <div>
                    <p className="font-medium text-slate-800" data-testid={`user-username-${u.id}`}>
                      {u.username}
                      {u.is_admin && (
                        <span className="ml-2 text-xs bg-slate-700 text-white px-2 py-1 rounded">ADMIN</span>
                      )}
                    </p>
                    <p className="text-sm text-slate-500">
                      Creato il {new Date(u.created_at).toLocaleDateString('it-IT')}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Dialog open={openPasswordDialog === u.id} onOpenChange={(open) => {
                      if (!open) {
                        setOpenPasswordDialog(null);
                        setNewPasswordForUser("");
                      }
                    }}>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          data-testid={`change-password-button-${u.id}`}
                          onClick={() => {
                            setOpenPasswordDialog(u.id);
                            setNewPasswordForUser("");
                          }}
                          className="border-slate-300 text-slate-700 hover:bg-slate-100"
                        >
                          <Lock className="w-4 h-4 mr-2" />
                          Cambia password
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Cambia password per {u.username}</DialogTitle>
                          <DialogDescription>
                            Inserisci la nuova password per questo utente.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label htmlFor={`change-password-${u.id}`} className="text-slate-700">Nuova password</Label>
                            <Input
                              id={`change-password-${u.id}`}
                              data-testid={`change-password-input-${u.id}`}
                              type="password"
                              placeholder="Nuova password"
                              value={newPasswordForUser}
                              onChange={(e) => setNewPasswordForUser(e.target.value)}
                              className="border-slate-300 focus:border-slate-500"
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button
                            data-testid={`change-password-confirm-${u.id}`}
                            onClick={() => handleChangePassword(u.id)}
                            className="bg-slate-700 hover:bg-slate-800 text-white"
                          >
                            Conferma
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                    {u.username !== "admin" && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="destructive"
                            size="sm"
                            data-testid={`delete-user-button-${u.id}`}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Elimina
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Conferma eliminazione</AlertDialogTitle>
                            <AlertDialogDescription>
                              Sei sicuro di voler eliminare l'utente {u.username}? Questa azione eliminerà anche tutti i post dell'utente.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel data-testid={`delete-user-cancel-${u.id}`}>Annulla</AlertDialogCancel>
                            <AlertDialogAction
                              data-testid={`delete-user-confirm-${u.id}`}
                              onClick={() => handleDeleteUser(u.id)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Elimina
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

    </div>
  );
};

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await axios.get(`${API}/auth/me`);
      setUser(response.data);
    } catch (error) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleLogout = async () => {
    try {
      await axios.post(`${API}/auth/logout`);
      setUser(null);
      toast.success("Disconnesso con successo");
    } catch (error) {
      setUser(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-slate-600">Caricamento...</div>
      </div>
    );
  }

  return (
    <div className="App">
      <Toaster position="top-center" richColors />
      <BrowserRouter>
        <Routes>
          <Route
            path="/login"
            element={user ? <Navigate to="/" /> : <LoginPage onLogin={handleLogin} />}
          />
          <Route
            path="/"
            element={user ? <HomePage user={user} onLogout={handleLogout} /> : <Navigate to="/login" />}
          />
          <Route
            path="/profilo"
            element={user ? <ProfilePage user={user} onLogout={handleLogout} /> : <Navigate to="/login" />}
          />
          <Route
            path="/admin"
            element={user && user.is_admin ? <AdminPage user={user} onLogout={handleLogout} /> : <Navigate to="/" />}
          />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
