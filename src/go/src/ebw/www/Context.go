package www

import (
	"context"
	"fmt"
	"net/http"
	"strconv"

	// "github.com/google/go-github/github"
	// "github.com/golang/glog"
	"github.com/gorilla/mux"
	"github.com/gorilla/schema"
	"github.com/gorilla/sessions"

	"ebw/git"
	"ebw/util"
)

var schemaDecoder = schema.NewDecoder()

type Context struct {
	R       *http.Request
	W       http.ResponseWriter
	Vars    map[string]string
	D       map[string]interface{}
	Client  *git.Client
	Session *sessions.Session
	Defers  []func()
}

type WebHandler func(c *Context) error

func (f WebHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	client, _ := git.ClientFromWebRequest(w, r)
	session, err := store.Get(r, `ebw-session`)
	if nil != err {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	c := &Context{
		R:       r,
		W:       w,
		D:       map[string]interface{}{},
		Vars:    mux.Vars(r),
		Client:  client,
		Session: session,
		Defers:  []func(){},
	}
	defer c.runDefers()
	if err := f(c); nil != err {
		WebError(w, r, err)
	}
}

func (c *Context) AddDefer(f func()) {
	c.Defers = append(c.Defers, f)
}

func (c *Context) runDefers() {
	l := len(c.Defers)
	for i := l - 1; i >= 0; i-- {
		c.Defers[i]()
	}
}

func (c *Context) Render(templ string, data map[string]interface{}) error {
	if err := c.SaveSession(); nil != err {
		return err
	}
	for k, v := range data {
		c.D[k] = v
	}
	_, ok := c.D[`CMVersion`]
	if !ok {
		c.D[`CMVersion`] = `5.12.0`
	}

	_, ok = c.D[`User`]
	if !ok && (nil != c.Client) {
		c.D[`User`] = c.Client.User
	}

	_, ok = c.D[`Flashes`]
	if !ok {
		flashes, err := c.Flashes()
		if nil != err {
			return err
		}
		c.D[`Flashes`] = flashes
	}

	return Render(c.W, c.R, templ, c.D)
}

func (c *Context) P(k string) string {
	v, ok := c.Vars[k]
	if ok {
		return v
	}
	return c.R.FormValue(k)
}

func (c *Context) PI(k string) int64 {
	i, _ := strconv.ParseInt(c.P(k), 10, 64)
	return i
}

func (c *Context) Redirect(f string, args ...interface{}) error {
	if err := c.SaveSession(); nil != err {
		return err
	}
	http.Redirect(c.W, c.R, fmt.Sprintf(f, args...), http.StatusFound)
	return nil
}

func (c *Context) Context() context.Context {
	return c.R.Context()
}

// Repo returns the git.Repo for the current request's
// repository. The called does not need to call .Free(), since it is
// added to the Context's .Defers
func (c *Context) Repo() (*git.Repo, error) {
	var err error
	client := Client(c.W, c.R)
	if nil == client {
		// GithubClient will have redirected us
		return nil, nil
	}

	repoOwner := c.Vars[`repoOwner`]
	repoName := c.Vars[`repoName`]

	repo, err := git.NewRepo(client, repoOwner, repoName)
	if nil != err {
		return nil, err
	}
	c.AddDefer(repo.Free)
	return repo, nil
}

// Decode does a gorilla schema decode of the incoming form values against
// the given interface.
func (c *Context) Decode(i interface{}) error {
	if err := c.R.ParseForm(); nil != err {
		return util.Error(err)
	}
	if err := schemaDecoder.Decode(i, c.R.URL.Query()); nil != err {
		return util.Error(err)
	}
	if err := schemaDecoder.Decode(i, c.R.PostForm); nil != err {
		return util.Error(err)
	}
	return nil
}
