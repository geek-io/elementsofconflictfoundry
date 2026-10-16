export function bindSkillHighlights(root) {
  for(const test of root.querySelectorAll("[data-associated-attribute]")) {
    const update=active=>{
      for(const attribute of root.querySelectorAll("[data-attribute]")) attribute.classList.toggle("eoc-attribute-highlight",active && attribute.dataset.attribute===test.dataset.associatedAttribute);
    };
    test.addEventListener("mouseenter",()=>update(true));
    test.addEventListener("mouseleave",()=>update(false));
    test.addEventListener("focusin",()=>update(true));
    test.addEventListener("focusout",event=>{if(!test.contains(event.relatedTarget))update(false);});
  }
}
