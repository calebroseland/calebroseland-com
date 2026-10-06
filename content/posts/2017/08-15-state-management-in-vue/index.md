---
kind: post
title: State Management in Vue
slug: state-management-in-vue
date: 2017-08-15
draft: false
tags:
  - Vue
  - State Management
---

*If you haven’t heard: [Vue](http://vuejs.org) is a progressive UI framework.*

State in Single Page Applications (SPAs) can be *hard to manage*.   
Opinions, patterns and libraries scatter the landscape. The signal-to-noise ratio is quite variable, and best practices are still being formed.

Like ingredients, knowing which *libraries and patterns* to use can be hard.

![](https://cdn-images-1.medium.com/max/800/1*V4rtvAh3ckFp8pNjQlpxUQ.jpeg)

Variety can be good, but sometimes difficult to navigate.

Before we begin, there are 3 varieties of State that we should define:

- **Simple**/local state (in a component) is usually for trivial scenarios, where the effort of other kinds [doesn’t justify their use](https://medium.com/@dan_abramov/you-might-not-need-redux-be46360cf367). *Visibility or if a dropdown or a modal* `isOpen`*.* Simple stuff that’s *used locally or as a prop*.
- **Complex**/shared/application state is for more intricate scenarios. Maybe stored as a global POJO — *the* `currentUser`*,* `hasPermissionX`*, etc.* The trouble is that *anything can mutate it* and it often takes significant time to trace the change origin. The lifecycle of a POJO is *raw and undefined —* great for flexibility, but hard to manage and difficult to reason about.
- **Persistent** state is the *most valuable kind* of data — we worry about it if the servers crash, or data center goes down — the `currentUser`’s email address, their personal data … whatever your app *stores long term*.  
We should know: what it is — a Schema, where to find it — a home, or source of truth, and H*ow* to access it — a familiar and consistent API.

---

## The solution: A [Data Access Layer](https://en.wikipedia.org/wiki/Data_access_layer) (DAL)

> …provides simplified access to data stored in a persistent storage of some kind

Sometimes we might use just Vue core and grab a library like [Axios](https://github.com/mzabriskie/axios).
This might be sufficient for small projects, but for large ones, we might benefit from a little more structure and flow control in our data pipelines.

In less volatile languages, standard patterns have solidified. But in JS land, architecting a solid solution can be a wild ride. Things are getting better though.. and Data Lifecycle Management is still a good investment.

Now, onto the specifics.

`let vueDal =` ***Vue + [Vuex](http://vuex.vuejs.org) + [Js-Data](http://www.js-data.io/v3.0/) + [Vuelidate](https://monterail.github.io/vuelidate/)***

For s*imple* state, we’ll just use Vue’s built-in and reactive `data` option.

For c*omplex* state, we’ll use a Vuex [store](https://vuex.vuejs.org/en/structure.html) for *global data*, then add a [Vuex module](https://vuex.vuejs.org/en/modules.html) for each route (and sub-route) to contain *route-specific* data.

For p*ersistent* state, we’ll use `js-data@3` as a [persistence API](http://www.js-data.io/v3.0/docs/reading-data) and Caching Layer\*.\* It can connect to RESTful APIs via [Adapters](http://www.js-data.io/v3.0/docs/adapter-pattern) &amp; [Mappers](http://www.js-data.io/v3.0/docs/modeling-your-data) that give access to your [Records](http://www.js-data.io/v3.0/docs/active-record-pattern). A *Record (aka Model, DTO, etc.)* can have [Relations](http://www.js-data.io/v3.0/docs/relations), Computed Properties, API-level Validation, and Events\*.\* A *Mapper* defines relationships, enables CRUD operations, and turns raw data into instances of either POJO Records or *Active Records* with reactivity and “smart methods,” such as `record#save()` or `record#destroy()`.

Continuing on… we’ll use **Vuelidate** for UI-level validation. While other vue validation libs often define rules *in the template markup*, vuelidate has a data-driven API to go with Vue’s data-driven UI.

It gives us *UI-centric* indicators like `$invalid` and `$dirty` booleans, and `$touch()`/`$reset()` methods to control the dirty state of a datum.

---

## **Important details to consider:**

### Composition

I believe a consistent API is crucial for the long-haul. Accessing your records using different methods can become fragmented over time. An HTTP library like [Axios](https://github.com/mzabriskie/axios) or [SuperAgent](https://github.com/visionmedia/superagent) is a good start, but we still have to concatenate a bunch of strings to get a URI to access.

To abstract this away, Js-Data automatically constructs the URI when accessing your API methods. All you need is `DS.findAll('nameOfThings')`, and it will then go out and run `GET /yourapi/nameOfThings/`. This is a very simple case, but it can handle nested endpoints, relations, IDs, custom parameters, etc. There’s also a query syntax to add filtering, pagination, sorting, etc. to your requests. You can [read about it here](http://www.js-data.io/v3.0/docs/reading-data).

It’s very customizable, and we can add options to any piece of the pipeline.

### Convenience &amp; Interoperability

*Events &amp; Listeners, Reactivity/Observability*

Both Vue and Js-Data have

- Solid event systems ✔️
- Efficient and performant reactivity systems ✔️

In Vue, [custom events](https://vuejs.org/v2/guide/events.html) are similar to DOM events, we can handle them on elements or component instances. They allow for vertical communication in a component structure. *Props down, Events up.*

[Events in Js-Data](http://www.js-data.io/v3.0/docs/change-tracking) can bubble up to Mappers and Collections—like the DataStore. The API is similar to Backbone Events.

Another thing Vue has (and *many* others have) is *reactivity.* Gone are the days of menial DOM updates or some custom abstraction to maintain.

I strongly recommend reading about [reactivity in the official Vue guide](https://vuejs.org/v2/guide/reactivity.html).

---

The reactivity system in Vue is based on ES5 [getters](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/get) and [setters](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/set) of `Object.defineProperty`, with the *property descriptor* stored *on the object itself.* It is implemented with `Observer`s and `Watcher`s in vue core.

The reactivity system in Js-Data is also based on ES5 getters/setters, but here, the [property descriptor](https://github.com/js-data/js-data/blob/3.0.1/src/Schema.js#L1055) is stored [*on the prototype*](https://github.com/js-data/js-data/blob/3.0.1/src/Schema.js#L989). It is implemented with, and managed by, the `Schema` class.

So, with Vue and Js-Data both using getters/setters, we’re all set, right?

Almost. We only need to be careful with *sequencing.* Before a Record instance is passed to a Vue instance, we need to first manually apply Vue reactivity, and then re-apply the Schema. It may sound complicated, but it only requires [a few lines in the constructor of a record](https://gist.github.com/calebroseland/2fa37abdb5560739b3b4b901382b0a90). Now we’re set.

Why, you ask?

Well, both libraries respect and retain existing setters, **on the object itself.**

This means that Js-Data will find Vue setters, but Vue will not find Js-Data setters (which are stored on the prototype.) This requires Js-Data to have the final responsibility on the matter.

Now we might say they are “cross-reactive.” Both Js-Data *and* Vue will respond to changes. Additionally, both reactivity systems work *on-demand*, no dirty checking required! This negates the *need* for immutability, and is tuned for performance out-of-the-box — no *need* for `shouldComponentUpdate`.

---

### Predictability

*Unidirectional Flow and Easy Reasoning*

Facebook brought forward the [Flux](https://facebook.github.io/flux/) pattern. Which defines a unidirectional data flow that makes state mutations easy to reason about and trace. Vuex is one implementation of this pattern for Vue. There are many good articles on it already, so I will just say that Vuex is a great *centralized state container*.

In addition to shared or complex state, we can use Vuex to store **references** to record *instances*. The DataStore still remains the client-side *cache* and *source of truth* for records, but we can manage *references* via Vuex.

For example: we can safely paginate a view of records, discarding *references* to the ones *currently* *shown*. When we go to page 2 (asking js-data for the next X), then go back to page 1 (asking for the previously cached records), we’ll get the *same instances* we had before, pending changes and all!

We can take this a step further and make a Vuex module for *reusable pagination and/or CRUD contexts*. How many different places do you have to keep track of pagination state `pageCount`,`currentPage`, `selectedSomethings`, etc. in your applications? Now we can keep things DRY.

Another use: route-specific Vuex modules. Registered statically or dynamically, they can be used to store *route or feature-specific state*.

[Vuex modules](https://vuex.vuejs.org/en/modules.html), especially when [namespaced](https://vuex.vuejs.org/en/modules.html#namespacing), can be a powerful tool.

---

### Integrity

*UI &amp; API Validation, Types, and Reflection*

I’ll admit: I’m not spectacular at validating everything, and that may be why I’ve spent a good amount of time ensuring these libs work together.

**When a problem occurs,**

**Poor UX** might provide a generic `error` message. Leaving the user confused, looking for what went wrong.

Their expectations aren’t met and *they have no idea why*.

**Sufficient UX** will (eventually) point out errors when they occur, but sometimes *after* a user has spent a lot of time on something. The `error` showed a proper message.

It may be a little unclear or delayed, but *at least they know why.*

**Good UX** will subtly point out errors *as they occur* in a non-irritating way, maybe inline as they type into an input, a colored border, etc.

Rather than placing blame on the user, a good message will show ways a user can correct the mistake in a way that *helps them* make progress.

I think it is good to apply validation to an input or datum *as early as possible* in the *lifecycle* of that piece of state. So, how might we do that?

**First up:** UI-level validation with [**Vuelidate**](https://monterail.github.io/vuelidate/). From their site:

> Simple, lightweight model-based validation for [Vue.js 2.0](http://vuejs.org/)

- Decoupled from templates
- Easy to use, custom validators
- Function composition (Moment.js, name-your-lib, etc.)

We can catch problems *right now*: before/while we mutate something, before the user moves to the next step or presses submit, and before we set sail to the API, waiting for what feels like 1,000 milliseconds.

Vuelidate can *observe changes* to anything in the context of a Vue instance. Props, local data, Vuex getters, even async stuff. If you can reactively render it in Vue, you can reactively validate it.

**Next up:** API-level validation with **[Js-Data](http://www.js-data.io/v3.0) [Schema](http://www.js-data.io/v3.0/docs/validation)**.

So now the user sees green checkboxes in the UI and finally hits submit. We can send the data, but we’ll have to wait, or worse: get a server error.

For better UX, we can bring *some* server validation to the frontend. Obviously we won’t be able to check for duplicates in the database or other system-wide checks, but at least some of it can be *offloaded to the client.*

> If we run Js-Data on the backend, our record schemas can be isomorphic.💡

> If our API or backend is not JS, we can use a [Schema-generator](https://github.com/NJsonSchema/NJsonSchema) to parse the backend API models to automatically create JS types and validation keywords that can be fed into Js-Data during a build. Maybe the topic of another post…

Rules on our API models now become the source of truth for validation parameters, *we no longer need hard-coded maxLength rules scattered around.*

Maybe we have pieces of a record that no UI is concerned about. Perhaps the WebApi arbitrarily requires a particular something we just don’t care about. We could define extraneous UI validation for it, make a custom function, *or* we can use API level validation.

API level validation is essentially a preflight check of the *whole record.*

Js-Data’s Schema is an extension of the [JSON Schema](http://json-schema.org/) standard. It gives us a definition of our record, with the ability to do these preflight checks.

[JSON Schema](http://json-schema.org/) is a recursive structure that uses [keywords](http://json-schema.org/latest/json-schema-validation.html#rfc.section.5):

- type (string, number, etc.)
- format (date, email, etc.)
- minLength, maxLength, pattern, definition and [more](http://json-schema.org/latest/json-schema-validation.html#rfc.section.5)

💡 We can use `schema#pick` to construct schema from a subset of properties.

If configured, Js-Data can also validate on property assignment and/or `record#save` `DS#create`, etc. If it doesn’t pass, an error will be thrown.

A schema also provides a foundation that we can use for *reflection*.

One use case might be giving a schema to a smart table component. Knowing the shape of the records it will be rendering, a cell can choose how best to present the information. If we add inline editing, reflection-based type-inference could allow an input to choose which kind: number, text, email, etc. It could even know how to automatically validate that info. Cool.

---

### Structure

*Computed Properties,* *Relations, and a place to call “home”*

Js-Data has a few additional keywords on top of JSON Schema that allows us to specify *record-based computed properties*.

Why? Vue already gives me [computed properties](https://vuejs.org/v2/guide/computed.html)? *Centralization.*\*\*

Like how we centralize shared state with Vuex, centralizing computed properties can reduce the number of duplicate formulas floating around.

With these computed properties *on the record*, we can access them from many different components. Instead of separate computed properties spread across the page, we can have *one* centrally located.

Vuex getters could (justifiably) be argued for, but I think those are better suited for *complex state*. These computed properties are for *persistent state.*

Obviously there is some [OOP](https://en.wikipedia.org/wiki/Object-oriented_programming) in here… but if you’re also in the [FP](https://en.wikipedia.org/wiki/Functional_programming) camp, I believe there is a hybrid between these two ever-discussed concepts.

I see value in both.

Purely OOP or purely FP can exclude the benefits of the other and cause headache trying to bend one or the other into compliance.
