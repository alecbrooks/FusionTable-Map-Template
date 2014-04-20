import fabric.api as fabric

DROPBOX = "~/Dropbox/Public/Map/"

def pushDropbox():
    """For showing others the prototype, copy to Dropbox."""
    fabric.local("cp -r * " + DROPBOX)
    print("Should be visible at: https://dl.dropboxusercontent.com/u/20888225/Map/index.html")
