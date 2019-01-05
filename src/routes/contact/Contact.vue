<template>
  <div class="route-contact">
    <div class="box">
      <div class="left has-text-left">
        <p class="name is-brand-font">Caleb Roseland</p>
        <p class="sub">Web App Developer</p>
        <div class="details">
          <p>
            <a href="tel:+1 507 476 1225"><i class="el-icon-phone"></i> +1 507 476 1225</a>
          </p>
          <p>
            <a href="mailto:caleb@calebroseland.com"><i class="el-icon-message"></i> caleb@calebroseland.com</a>
          </p>
          <p>
            <a href="https://maps.google.com/?q=Minnesota,+USA"><i class="el-icon-location"></i> Minnesota, USA</a>
          </p>
        </div>
      </div>
      <div class="right has-text-right">
        <router-link to="/" class="close"><i class="el-icon-close"></i></router-link>
      </div>
    </div>
  </div>
</template>

<script>

export default {
  name: 'contact',
  mixins: [],
  components: { }
}
</script>

<style lang="sass" scoped>

@import '~bulma/sass/utilities/mixins'

.route-contact
  height: 100%
  display: flex
  flex-direction: column
  align-items: center
  justify-content: center

.box
  display: flex
  justify-content: space-between
  margin: 3rem 0
  font-size: 1.25rem
  +tablet
    width: 30rem
    height: 17.5rem

.details
  margin: 2rem 0 0

.left
  padding: .25rem 0 1rem 1rem

.close
  font-size: 3rem
  padding: .5rem

.name
  font-size: 2.5rem

</style>
